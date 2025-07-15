import React, { useState, useMemo } from 'react';
import { Calculator, FileText, Download, Trash2 } from 'lucide-react';

const FileSizeCalculator = () => {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);

  // Parse different file size formats
  const parseSize = (sizeStr) => {
    if (!sizeStr) return 0;

    const cleanSize = sizeStr.toString().trim().toLowerCase();
    const match = cleanSize.match(/^([\d.,]+)\s*([kmgtpe]?b?|bytes?)$/i);

    if (!match) return 0;

    const number = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toLowerCase();

    const multipliers = {
      'b': 1, 'bytes': 1, '': 1,
      'kb': 1024, 'k': 1024,
      'mb': 1024 * 1024, 'm': 1024 * 1024,
      'gb': 1024 * 1024 * 1024, 'g': 1024 * 1024 * 1024,
      'tb': 1024 * 1024 * 1024 * 1024, 't': 1024 * 1024 * 1024 * 1024,
      'pb': 1024 * 1024 * 1024 * 1024 * 1024, 'p': 1024 * 1024 * 1024 * 1024 * 1024,
      'eb': 1024 * 1024 * 1024 * 1024 * 1024 * 1024, 'e': 1024 * 1024 * 1024 * 1024 * 1024 * 1024
    };

    return number * (multipliers[unit] || 1);
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Parse input text for file information
  const parseInput = () => {
    if (!input.trim()) return;

    const lines = input.split('\n').filter(line => line.trim());
    const newFiles = [];

    for (const line of lines) {
      // Skip parent directory links and non-file entries
      if (line.includes('../') || line.includes('<h1>') || line.includes('<hr>')) continue;

      let fileName = '';
      let fileSize = '';

      // Pattern 1: Wikimedia-style HTML directory listing
      // <a href="filename">filename</a> 20-Mar-2025 08:30 1384
      let match = line.match(/<a[^>]*href="([^"]+)"[^>]*>([^<&]+)(?:\.\.\.)?(?:&gt;)?<\/a>\s+[\d-]+\s+[\d:]+\s+([\d,]+)/);
      if (match) {
        fileName = match[1].trim();
        fileSize = match[3].trim();
        // Handle truncated filenames (the display name might be cut off)
        if (match[2].includes('...')) {
          fileName = match[1]; // Use href value for full filename
        }
      }

      // Pattern 2: General HTML directory listing with size units
      if (!match) {
        match = line.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>\s+[\d-]+\s+[\d:]+\s+([\d.,]+\s*[KMGTPE]?B?)/i);
        if (match) {
          fileName = match[2].trim();
          fileSize = match[3].trim();
        }
      }

      // Pattern 3: Simple space-separated (e.g., "file.txt 1.2M" or "1.2M file.txt")
      if (!match) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          // Check if last part looks like a size
          if (parts[parts.length - 1].match(/^[\d.,]+\s*[KMGTPE]?B?$/i)) {
            fileSize = parts[parts.length - 1];
            fileName = parts.slice(0, -1).join(' ');
          } else if (parts[0].match(/^[\d.,]+\s*[KMGTPE]?B?$/i)) {
            fileSize = parts[0];
            fileName = parts.slice(1).join(' ');
          }
        }
      }

      if (fileName && fileSize) {
        const sizeInBytes = parseSize(fileSize);
        if (sizeInBytes > 0) {
          newFiles.push({
            name: fileName,
            size: sizeInBytes,
            originalSize: fileSize
          });
        }
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setInput('');
  };

  // Manual file entry
  const addManualFile = () => {
    const name = prompt('Enter file name:');
    const size = prompt('Enter file size (e.g., 1.5GB, 500MB, 1024KB):');

    if (name && size) {
      const sizeInBytes = parseSize(size);
      if (sizeInBytes > 0) {
        setFiles(prev => [...prev, {
          name: name.trim(),
          size: sizeInBytes,
          originalSize: size
        }]);
      }
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const avgSize = files.length > 0 ? totalSize / files.length : 0;
    const largest = files.reduce((max, file) => file.size > max.size ? file : max, { size: 0 });
    const smallest = files.reduce((min, file) => file.size < min.size ? file : min, { size: Infinity });

    return {
      totalSize,
      avgSize,
      largest: largest.size > 0 ? largest : null,
      smallest: smallest.size < Infinity ? smallest : null,
      count: files.length
    };
  }, [files]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Calculator className="text-blue-600" />
          File Size Calculator
        </h1>
        <p className="text-gray-600">
          Calculate total file sizes from directory listings. Paste content from file listings or add files manually.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Files</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Directory Listing
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste directory listing here... Supports various formats:
- HTML directory listings
- Space/tab separated files with sizes
- Custom formats with file names and sizes"
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={parseInput}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Parse Files
            </button>
            <button
              onClick={addManualFile}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
            >
              Add Manual Entry
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Size</h3>
            <p className="text-2xl font-bold text-blue-700">{formatBytes(stats.totalSize)}</p>
            <p className="text-sm text-blue-600">{stats.totalSize.toLocaleString()} bytes</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">File Count</h3>
            <p className="text-2xl font-bold text-green-700">{stats.count}</p>
            <p className="text-sm text-green-600">files total</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Average Size</h3>
            <p className="text-2xl font-bold text-purple-700">{formatBytes(stats.avgSize)}</p>
            <p className="text-sm text-purple-600">per file</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Size Range</h3>
            <p className="text-sm text-orange-700">
              <span className="font-bold">Largest:</span> {stats.largest ? formatBytes(stats.largest.size) : 'N/A'}
            </p>
            <p className="text-sm text-orange-700">
              <span className="font-bold">Smallest:</span> {stats.smallest ? formatBytes(stats.smallest.size) : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="text-gray-600" />
              Files ({files.length})
            </h2>
            <button
              onClick={() => setFiles([])}
              className="flex items-center gap-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bytes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {file.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right font-mono">
                      {file.size.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </diva>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>For Wikimedia dumps:</strong> Copy the entire HTML source or just the file listing section and paste above.</p>
          <p><strong>Supported formats:</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• HTML directory listings (like Wikimedia dumps)</li>
            <li>• Space-separated: filename size</li>
            <li>• Tab-separated files</li>
            <li>• Manual entry for individual files</li>
          </ul>
          <p><strong>Size formats:</strong> Supports bytes (plain numbers), KB, MB, GB, TB, PB, EB</p>
        </div>
      </div>
    </div>
  );
};

export default FileSizeCalculator;