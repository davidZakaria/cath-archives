// Advanced Search API endpoint
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import Movie from '@/models/Movie';
import Character from '@/models/Character';

export interface SearchFilters {
  query?: string;
  decade?: string;         // e.g., "1950s", "1960s"
  yearFrom?: number;
  yearTo?: number;
  linkedMovie?: string;    // Movie ID
  linkedCharacter?: string; // Character ID
  source?: string;         // Magazine/publication source
  status?: 'draft' | 'pending_review' | 'published';
  linkType?: 'movie' | 'character' | 'all';
}

export interface SearchResult {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImagePath?: string;
  totalPages: number;
  status: string;
  linkType?: string;
  linkedMovie?: {
    _id: string;
    arabicName: string;
    englishName?: string;
    year?: number;
    posterImage?: string;
  };
  linkedCharacter?: {
    _id: string;
    arabicName: string;
    englishName?: string;
    type?: string;
    photoImage?: string;
  };
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
  accuracyScore?: number;
  publishedAt?: string;
  createdAt: string;
  score?: number; // Text search relevance score
  highlights?: string[]; // Matching text snippets
}

// Decade to year range mapping
const DECADE_RANGES: Record<string, { from: number; to: number }> = {
  '1930s': { from: 1930, to: 1939 },
  '1940s': { from: 1940, to: 1949 },
  '1950s': { from: 1950, to: 1959 },
  '1960s': { from: 1960, to: 1969 },
  '1970s': { from: 1970, to: 1979 },
  '1980s': { from: 1980, to: 1989 },
  '1990s': { from: 1990, to: 1999 },
  '2000s': { from: 2000, to: 2009 },
  '2010s': { from: 2010, to: 2019 },
  '2020s': { from: 2020, to: 2029 },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse search parameters
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const decade = searchParams.get('decade');
    const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : undefined;
    const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!) : undefined;
    const linkedMovie = searchParams.get('linkedMovie');
    const linkedCharacter = searchParams.get('linkedCharacter');
    const source = searchParams.get('source');
    const status = searchParams.get('status') as SearchFilters['status'] || 'published';
    const linkType = searchParams.get('linkType') as SearchFilters['linkType'] || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sortBy') || 'relevance'; // relevance, date, accuracy

    await connectDB();

    // Build the query
    const mongoQuery: Record<string, unknown> = {};
    
    // Status filter (default to published for public search)
    if (status && status !== 'all') {
      mongoQuery.status = status;
    }

    // Full-text search
    if (query.trim()) {
      mongoQuery.$text = { $search: query };
    }

    // Link type filter
    if (linkType === 'movie') {
      mongoQuery.linkType = 'movie';
      mongoQuery.linkedMovie = { $exists: true };
    } else if (linkType === 'character') {
      mongoQuery.linkType = 'character';
      mongoQuery.linkedCharacter = { $exists: true };
    }

    // Specific entity filters
    if (linkedMovie) {
      mongoQuery.linkedMovie = linkedMovie;
    }
    if (linkedCharacter) {
      mongoQuery.linkedCharacter = linkedCharacter;
    }

    // Source filter
    if (source) {
      mongoQuery['metadata.source'] = { $regex: source, $options: 'i' };
    }

    // Year/decade filtering requires aggregation with linked movie
    let useAggregation = false;
    let yearFilter: { from?: number; to?: number } | null = null;

    if (decade && DECADE_RANGES[decade]) {
      yearFilter = DECADE_RANGES[decade];
      useAggregation = true;
    } else if (yearFrom || yearTo) {
      yearFilter = { from: yearFrom, to: yearTo };
      useAggregation = true;
    }

    let results: SearchResult[];
    let total: number;

    if (useAggregation && yearFilter) {
      // Use aggregation pipeline for year filtering (needs to join with Movie)
      const pipeline: any[] = [
        { $match: mongoQuery },
        {
          $lookup: {
            from: 'movies',
            localField: 'linkedMovie',
            foreignField: '_id',
            as: 'linkedMovieData',
          },
        },
        {
          $lookup: {
            from: 'characters',
            localField: 'linkedCharacter',
            foreignField: '_id',
            as: 'linkedCharacterData',
          },
        },
        {
          $addFields: {
            linkedMovie: { $arrayElemAt: ['$linkedMovieData', 0] },
            linkedCharacter: { $arrayElemAt: ['$linkedCharacterData', 0] },
          },
        },
      ];

      // Add year filter
      if (yearFilter.from || yearFilter.to) {
        const yearMatch: Record<string, unknown> = {};
        if (yearFilter.from) {
          yearMatch['linkedMovie.year'] = { $gte: yearFilter.from };
        }
        if (yearFilter.to) {
          if (yearMatch['linkedMovie.year']) {
            yearMatch['linkedMovie.year'] = { 
              ...(yearMatch['linkedMovie.year'] as object), 
              $lte: yearFilter.to 
            };
          } else {
            yearMatch['linkedMovie.year'] = { $lte: yearFilter.to };
          }
        }
        pipeline.push({ $match: yearMatch });
      }

      // Add text score if searching
      if (query.trim()) {
        pipeline.unshift({ $match: { $text: { $search: query } } });
        pipeline.splice(1, 1); // Remove the duplicate $match
        pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
      }

      // Sort
      if (sortBy === 'relevance' && query.trim()) {
        pipeline.push({ $sort: { score: -1 } });
      } else if (sortBy === 'date') {
        pipeline.push({ $sort: { publishedAt: -1, createdAt: -1 } });
      } else if (sortBy === 'accuracy') {
        pipeline.push({ $sort: { accuracyScore: -1 } });
      } else {
        pipeline.push({ $sort: { createdAt: -1 } });
      }

      // Count total
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Collection.aggregate(countPipeline);
      total = countResult[0]?.total || 0;

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Project fields
      pipeline.push({
        $project: {
          title: 1,
          subtitle: 1,
          description: 1,
          coverImagePath: 1,
          totalPages: 1,
          status: 1,
          linkType: 1,
          linkedMovie: {
            _id: 1,
            arabicName: 1,
            englishName: 1,
            year: 1,
            posterImage: 1,
          },
          linkedCharacter: {
            _id: 1,
            arabicName: 1,
            englishName: 1,
            type: 1,
            photoImage: 1,
          },
          metadata: 1,
          accuracyScore: 1,
          publishedAt: 1,
          createdAt: 1,
          score: 1,
        },
      });

      results = await Collection.aggregate(pipeline);
    } else {
      // Simple query without year filtering
      let queryBuilder = Collection.find(mongoQuery);

      // Add text score projection if searching
      if (query.trim()) {
        queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
      }

      // Sorting
      if (sortBy === 'relevance' && query.trim()) {
        queryBuilder = queryBuilder.sort({ score: { $meta: 'textScore' } });
      } else if (sortBy === 'date') {
        queryBuilder = queryBuilder.sort({ publishedAt: -1, createdAt: -1 });
      } else if (sortBy === 'accuracy') {
        queryBuilder = queryBuilder.sort({ accuracyScore: -1 });
      } else {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      }

      // Populate linked entities
      queryBuilder = queryBuilder
        .populate('linkedMovie', 'arabicName englishName year posterImage')
        .populate('linkedCharacter', 'arabicName englishName type photoImage');

      // Select fields
      queryBuilder = queryBuilder.select(
        'title subtitle description coverImagePath totalPages status linkType linkedMovie linkedCharacter metadata accuracyScore publishedAt createdAt'
      );

      // Count and paginate
      total = await Collection.countDocuments(mongoQuery);
      results = await queryBuilder
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Generate highlights from combinedOcrText if searching
    if (query.trim() && results.length > 0) {
      // Fetch full text for highlighting (separate query for efficiency)
      const ids = results.map(r => r._id);
      const fullTexts = await Collection.find({ _id: { $in: ids } })
        .select('_id combinedOcrText combinedAiText')
        .lean();

      const textMap = new Map(fullTexts.map(t => [t._id.toString(), t]));

      results = results.map(r => {
        const fullText = textMap.get(r._id.toString());
        const searchText = fullText?.combinedAiText || fullText?.combinedOcrText || '';
        const highlights = extractHighlights(searchText, query);
        return { ...r, highlights };
      });
    }

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      filters: {
        query,
        decade,
        yearFrom,
        yearTo,
        linkedMovie,
        linkedCharacter,
        source,
        status,
        linkType,
        sortBy,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Extract text snippets containing search terms
 */
function extractHighlights(text: string, query: string, maxHighlights = 3, contextLength = 100): string[] {
  if (!text || !query) return [];

  const highlights: string[] = [];
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const textLower = text.toLowerCase();

  for (const term of searchTerms) {
    let startIndex = 0;
    while (highlights.length < maxHighlights) {
      const index = textLower.indexOf(term, startIndex);
      if (index === -1) break;

      // Extract context around the match
      const start = Math.max(0, index - contextLength / 2);
      const end = Math.min(text.length, index + term.length + contextLength / 2);
      
      let highlight = text.substring(start, end).trim();
      
      // Add ellipsis if truncated
      if (start > 0) highlight = '...' + highlight;
      if (end < text.length) highlight = highlight + '...';

      // Avoid duplicate highlights
      if (!highlights.some(h => h.includes(highlight.substring(3, 50)))) {
        highlights.push(highlight);
      }

      startIndex = index + term.length;
    }

    if (highlights.length >= maxHighlights) break;
  }

  return highlights;
}

// POST endpoint for more complex search queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters, page = 1, limit = 20, sortBy = 'relevance' } = body;

    // Convert POST body to URL params and call GET handler
    const url = new URL(request.url);
    if (query) url.searchParams.set('q', query);
    if (filters?.decade) url.searchParams.set('decade', filters.decade);
    if (filters?.yearFrom) url.searchParams.set('yearFrom', String(filters.yearFrom));
    if (filters?.yearTo) url.searchParams.set('yearTo', String(filters.yearTo));
    if (filters?.linkedMovie) url.searchParams.set('linkedMovie', filters.linkedMovie);
    if (filters?.linkedCharacter) url.searchParams.set('linkedCharacter', filters.linkedCharacter);
    if (filters?.source) url.searchParams.set('source', filters.source);
    if (filters?.status) url.searchParams.set('status', filters.status);
    if (filters?.linkType) url.searchParams.set('linkType', filters.linkType);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sortBy', sortBy);

    const newRequest = new NextRequest(url);
    return GET(newRequest);
  } catch (error) {
    console.error('Search POST error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

