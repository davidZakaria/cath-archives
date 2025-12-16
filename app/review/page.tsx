import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

async function getDocuments(status?: string) {
  try {
    await connectDB();
    
    const query: any = {};
    if (status && status !== 'all') {
      query.reviewStatus = status;
    }
    
    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .lean();
    
    // Convert to plain JSON-serializable objects
    return JSON.parse(JSON.stringify(
      documents.map((doc) => ({
        _id: doc._id.toString(),
        filename: doc.filename,
        imagePath: doc.imagePath,
        ocrConfidence: doc.ocrConfidence || 0,
        reviewStatus: doc.reviewStatus,
        reviewTimeSeconds: doc.reviewTimeSeconds || 0,
        uploadedAt: doc.uploadedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))
    ));
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = statusParam || 'all';
  const documents = await getDocuments(status !== 'all' ? status : undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
              <p className="text-gray-600 mt-1">
                {documents.length} document(s) found
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              + Upload New
            </Link>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ].map((filter) => (
              <Link
                key={filter.value}
                href={`/review?status=${filter.value}`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  status === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Documents List */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No documents found</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700"
            >
              Upload your first document →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc: any) => (
              <Link
                key={doc._id}
                href={`/review/${doc._id}`}
                className="bg-white rounded-lg p-6 hover:shadow-md transition border-2 border-transparent hover:border-blue-300"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={doc.imagePath}
                      alt={doc.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {doc.filename}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                      <span>
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                      {doc.ocrConfidence > 0 && (
                        <span>
                          OCR Confidence:{' '}
                          <span
                            className={
                              doc.ocrConfidence > 0.8
                                ? 'text-green-600 font-medium'
                                : doc.ocrConfidence > 0.6
                                ? 'text-yellow-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {Math.round(doc.ocrConfidence * 100)}%
                          </span>
                        </span>
                      )}
                      {doc.reviewTimeSeconds > 0 && (
                        <span>
                          Review Time: {Math.floor(doc.reviewTimeSeconds / 60)}m{' '}
                          {doc.reviewTimeSeconds % 60}s
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          doc.reviewStatus === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : doc.reviewStatus === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {doc.reviewStatus === 'completed'
                          ? '✓ Completed'
                          : doc.reviewStatus === 'in_progress'
                          ? '⏳ In Progress'
                          : '📝 Pending Review'}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

