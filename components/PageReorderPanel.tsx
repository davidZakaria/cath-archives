'use client';

import { useState, useCallback } from 'react';
import { PageLayout, TextBlock } from '@/types';

interface PageReorderPanelProps {
  pages: PageLayout[];
  onReorderPages: (pages: PageLayout[]) => void;
  onReorderBlocks: (pageIndex: number, blocks: TextBlock[]) => void;
  onClose: () => void;
}

export default function PageReorderPanel({
  pages,
  onReorderPages,
  onReorderBlocks,
  onClose,
}: PageReorderPanelProps) {
  const [localPages, setLocalPages] = useState<PageLayout[]>(pages);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'pages' | 'blocks'>('pages');

  // Page drag and drop handlers
  const handlePageDragStart = useCallback((index: number) => {
    setDraggedPageIndex(index);
  }, []);

  const handlePageDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === index) return;

    const newPages = [...localPages];
    const draggedPage = newPages[draggedPageIndex];
    newPages.splice(draggedPageIndex, 1);
    newPages.splice(index, 0, draggedPage);
    
    // Update order numbers
    newPages.forEach((page, i) => {
      page.order = i + 1;
    });

    setLocalPages(newPages);
    setDraggedPageIndex(index);
  }, [draggedPageIndex, localPages]);

  const handlePageDragEnd = useCallback(() => {
    setDraggedPageIndex(null);
    onReorderPages(localPages);
  }, [localPages, onReorderPages]);

  // Block drag and drop handlers
  const handleBlockDragStart = useCallback((blockIndex: number) => {
    setDraggedBlockIndex(blockIndex);
  }, []);

  const handleBlockDragOver = useCallback((e: React.DragEvent, blockIndex: number) => {
    e.preventDefault();
    if (selectedPageIndex === null || draggedBlockIndex === null || draggedBlockIndex === blockIndex) return;

    const newPages = [...localPages];
    const blocks = [...newPages[selectedPageIndex].textBlocks];
    const draggedBlock = blocks[draggedBlockIndex];
    blocks.splice(draggedBlockIndex, 1);
    blocks.splice(blockIndex, 0, draggedBlock);
    
    // Update order numbers
    blocks.forEach((block, i) => {
      block.order = i + 1;
    });

    newPages[selectedPageIndex].textBlocks = blocks;
    setLocalPages(newPages);
    setDraggedBlockIndex(blockIndex);
  }, [selectedPageIndex, draggedBlockIndex, localPages]);

  const handleBlockDragEnd = useCallback(() => {
    if (selectedPageIndex !== null) {
      onReorderBlocks(selectedPageIndex, localPages[selectedPageIndex].textBlocks);
    }
    setDraggedBlockIndex(null);
  }, [selectedPageIndex, localPages, onReorderBlocks]);

  // Move page up/down with buttons
  const movePageUp = useCallback((index: number) => {
    if (index === 0) return;
    const newPages = [...localPages];
    [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    newPages.forEach((page, i) => { page.order = i + 1; });
    setLocalPages(newPages);
    onReorderPages(newPages);
  }, [localPages, onReorderPages]);

  const movePageDown = useCallback((index: number) => {
    if (index === localPages.length - 1) return;
    const newPages = [...localPages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    newPages.forEach((page, i) => { page.order = i + 1; });
    setLocalPages(newPages);
    onReorderPages(newPages);
  }, [localPages, onReorderPages]);

  // Move block up/down with buttons
  const moveBlockUp = useCallback((blockIndex: number) => {
    if (selectedPageIndex === null || blockIndex === 0) return;
    const newPages = [...localPages];
    const blocks = [...newPages[selectedPageIndex].textBlocks];
    [blocks[blockIndex - 1], blocks[blockIndex]] = [blocks[blockIndex], blocks[blockIndex - 1]];
    blocks.forEach((block, i) => { block.order = i + 1; });
    newPages[selectedPageIndex].textBlocks = blocks;
    setLocalPages(newPages);
    onReorderBlocks(selectedPageIndex, blocks);
  }, [selectedPageIndex, localPages, onReorderBlocks]);

  const moveBlockDown = useCallback((blockIndex: number) => {
    if (selectedPageIndex === null) return;
    const blocks = localPages[selectedPageIndex].textBlocks;
    if (blockIndex === blocks.length - 1) return;
    
    const newPages = [...localPages];
    const newBlocks = [...blocks];
    [newBlocks[blockIndex], newBlocks[blockIndex + 1]] = [newBlocks[blockIndex + 1], newBlocks[blockIndex]];
    newBlocks.forEach((block, i) => { block.order = i + 1; });
    newPages[selectedPageIndex].textBlocks = newBlocks;
    setLocalPages(newPages);
    onReorderBlocks(selectedPageIndex, newBlocks);
  }, [selectedPageIndex, localPages, onReorderBlocks]);

  // Block type styling
  const getBlockTypeStyle = (type: string) => {
    switch (type) {
      case 'title': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'subtitle': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'heading': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'body': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'caption': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'quote': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Reorder Pages & Blocks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Drag and drop to rearrange pages and text blocks
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('pages')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'pages' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📄 Page Order
            </button>
            <button
              onClick={() => setViewMode('blocks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'blocks' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📝 Text Blocks
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'pages' ? (
            /* Page reordering view */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {localPages.map((page, index) => (
                <div
                  key={page.documentId}
                  draggable
                  onDragStart={() => handlePageDragStart(index)}
                  onDragOver={(e) => handlePageDragOver(e, index)}
                  onDragEnd={handlePageDragEnd}
                  className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-move transition-all ${
                    draggedPageIndex === index 
                      ? 'border-indigo-500 shadow-lg scale-105' 
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {/* Page thumbnail placeholder */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {page.thumbnailPath ? (
                      <img 
                        src={page.thumbnailPath} 
                        alt={`Page ${page.pageNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-4xl text-gray-400 mb-2">📄</div>
                        <div className="text-sm text-gray-500">
                          {page.textBlocks.length} blocks
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Page info */}
                  <div className="p-3 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">Page {page.order}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); movePageUp(index); }}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); movePageDown(index); }}
                          disabled={index === localPages.length - 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Drag indicator */}
                  <div className="absolute top-2 right-2 bg-white/80 rounded p-1">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Block reordering view */
            <div className="flex gap-6">
              {/* Page selector */}
              <div className="w-48 flex-shrink-0">
                <h3 className="font-bold text-gray-700 mb-3">Select Page</h3>
                <div className="space-y-2">
                  {localPages.map((page, index) => (
                    <button
                      key={page.documentId}
                      onClick={() => setSelectedPageIndex(index)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedPageIndex === index
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-medium">Page {page.order}</div>
                      <div className="text-xs opacity-75">
                        {page.textBlocks.length} blocks
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Block list */}
              <div className="flex-1">
                {selectedPageIndex !== null ? (
                  <>
                    <h3 className="font-bold text-gray-700 mb-3">
                      Text Blocks - Page {localPages[selectedPageIndex].order}
                    </h3>
                    <div className="space-y-2">
                      {localPages[selectedPageIndex].textBlocks.map((block, blockIndex) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => handleBlockDragStart(blockIndex)}
                          onDragOver={(e) => handleBlockDragOver(e, blockIndex)}
                          onDragEnd={handleBlockDragEnd}
                          className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-move transition-all ${
                            draggedBlockIndex === blockIndex
                              ? 'border-indigo-500 shadow-lg'
                              : 'border-gray-200 hover:border-indigo-300'
                          } ${getBlockTypeStyle(block.blockType)}`}
                        >
                          {/* Drag handle */}
                          <div className="flex-shrink-0 pt-1">
                            <svg className="w-5 h-5 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                            </svg>
                          </div>

                          {/* Block content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold uppercase opacity-75">
                                {block.blockType}
                              </span>
                              <span className="text-xs opacity-50">
                                #{block.order}
                              </span>
                            </div>
                            <div 
                              className="font-arabic text-right line-clamp-2" 
                              dir="rtl"
                            >
                              {block.text}
                            </div>
                          </div>

                          {/* Move buttons */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlockUp(blockIndex); }}
                              disabled={blockIndex === 0}
                              className="p-1 rounded hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlockDown(blockIndex); }}
                              disabled={blockIndex === localPages[selectedPageIndex].textBlocks.length - 1}
                              className="p-1 rounded hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">👈</div>
                      <div>Select a page to view and reorder its text blocks</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Drag items to reorder, or use the arrow buttons
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
