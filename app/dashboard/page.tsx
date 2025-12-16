import MetricsCard from '@/components/MetricsCard';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

async function getMetrics() {
  try {
    await connectDB();
    
    const [
      totalDocuments,
      pendingReview,
      inProgress,
      completed,
      avgConfidenceResult,
      avgReviewTimeResult,
      avgCorrectionsResult,
    ] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ reviewStatus: 'pending' }),
      Document.countDocuments({ reviewStatus: 'in_progress' }),
      Document.countDocuments({ reviewStatus: 'completed' }),
      Document.aggregate([
        { $group: { _id: null, avgConfidence: { $avg: '$ocrConfidence' } } },
      ]),
      Document.aggregate([
        { $match: { reviewTimeSeconds: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgTime: { $avg: '$reviewTimeSeconds' } } },
      ]),
      Document.aggregate([
        { $match: { correctionsCount: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgCorrections: { $avg: '$correctionsCount' } } },
      ]),
    ]);

    return {
      totalDocuments,
      pendingReview,
      inProgress,
      completed,
      avgOcrConfidence: avgConfidenceResult[0]?.avgConfidence || 0,
      avgReviewTime: avgReviewTimeResult[0]?.avgTime || 0,
      avgCorrections: avgCorrectionsResult[0]?.avgCorrections || 0,
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const metrics = await getMetrics();

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Failed to load metrics</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const completionRate =
    metrics.totalDocuments > 0
      ? Math.round((metrics.completed / metrics.totalDocuments) * 100)
      : 0;

  const avgReviewMinutes = Math.floor(metrics.avgReviewTime / 60);
  const avgReviewSeconds = Math.round(metrics.avgReviewTime % 60);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                System metrics and performance statistics
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/review"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Review Queue
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg"
              >
                Upload
              </Link>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Total Documents"
            value={metrics.totalDocuments}
            subtitle="All uploaded documents"
            color="blue"
          />
          <MetricsCard
            title="Pending Review"
            value={metrics.pendingReview}
            subtitle="Awaiting human verification"
            color="yellow"
          />
          <MetricsCard
            title="In Progress"
            value={metrics.inProgress}
            subtitle="Currently being reviewed"
            color="gray"
          />
          <MetricsCard
            title="Completed"
            value={metrics.completed}
            subtitle={`${completionRate}% completion rate`}
            color="green"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <MetricsCard
            title="Avg OCR Confidence"
            value={`${Math.round(metrics.avgOcrConfidence * 100)}%`}
            subtitle="Higher is better"
            color={metrics.avgOcrConfidence > 0.7 ? 'green' : 'yellow'}
          />
          <MetricsCard
            title="Avg Review Time"
            value={`${avgReviewMinutes}m ${avgReviewSeconds}s`}
            subtitle="Per document"
            color="blue"
          />
          <MetricsCard
            title="Avg Corrections"
            value={Math.round(metrics.avgCorrections)}
            subtitle="OCR errors per document"
            color="gray"
          />
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Insights</h2>
          <div className="space-y-3 text-gray-700">
            {metrics.totalDocuments === 0 ? (
              <p>📊 No documents yet. Upload some manuscripts to see insights!</p>
            ) : (
              <>
                <p>
                  📈 <strong>Throughput:</strong> Based on average review time, you can
                  process approximately{' '}
                  {metrics.avgReviewTime > 0
                    ? Math.round(3600 / metrics.avgReviewTime)
                    : 0}{' '}
                  documents per hour.
                </p>
                <p>
                  🎯 <strong>OCR Quality:</strong>{' '}
                  {metrics.avgOcrConfidence > 0.8
                    ? 'Excellent! OCR is producing high-quality results.'
                    : metrics.avgOcrConfidence > 0.6
                    ? 'Good OCR quality, but manual review is important.'
                    : 'OCR quality is low. Consider improving image quality.'}
                </p>
                <p>
                  ✏️ <strong>Review Efficiency:</strong> Average of{' '}
                  {Math.round(metrics.avgCorrections)} corrections per document{' '}
                  {metrics.avgCorrections < 10
                    ? '(Very efficient!)'
                    : metrics.avgCorrections < 50
                    ? '(Good efficiency)'
                    : '(High correction rate)'}
                </p>
                {metrics.pendingReview > 0 && (
                  <p>
                    ⏰ <strong>Estimated Time:</strong> Approximately{' '}
                    {Math.floor((metrics.pendingReview * metrics.avgReviewTime) / 3600)}{' '}
                    hours needed to complete all pending reviews.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

