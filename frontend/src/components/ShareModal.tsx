import { useEffect, useState } from 'react';
import { X, Link2, Globe, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as shareApi from '../api/share.api';
import { getApiErrorMessage } from '../utils/apiError';

interface ShareModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface ShareLink {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

const expiryOptions = [
  { label: 'Never expires', value: '' },
  { label: 'Expires in 7 days', value: '7' },
  { label: 'Expires in 30 days', value: '30' },
];

export default function ShareModal({ projectId, projectName, onClose }: ShareModalProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [copied, setCopied] = useState(false);

  const linkUrl = shareLink ? `${window.location.origin}/board/${shareLink.token}` : null;

  useEffect(() => {
    let cancelled = false;

    shareApi
      .getShareLink(projectId)
      .then(({ data }) => {
        if (!cancelled) setShareLink(data.data.shareLink);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Failed to load share settings'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleCreate = async () => {
    setIsWorking(true);
    try {
      const { data } = await shareApi.createShareLink(projectId, {
        expiresInDays: expiry ? Number(expiry) : null,
      });
      setShareLink(data.data.shareLink);
      toast.success('Public link created');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create share link'));
    } finally {
      setIsWorking(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Revoke this link? Anyone using it will immediately lose access.')) return;

    setIsWorking(true);
    try {
      await shareApi.revokeShareLink(projectId);
      setShareLink(null);
      setCopied(false);
      toast.success('Link revoked');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to revoke link'));
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Globe size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Board</h2>
              <p className="text-sm text-gray-500 line-clamp-1">
                Read-only public view of {projectName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shareLink ? (
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Public Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 truncate font-mono">
                  {linkUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 pt-0.5">
                {shareLink.expiresAt
                  ? `Expires ${new Date(shareLink.expiresAt).toLocaleDateString()}`
                  : 'This link does not expire'}
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle size={16} />
                Anyone with this link can view
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                No account is needed. Visitors see this board's tasks and assignee names — they
                cannot edit anything, and cannot see your other projects or member emails.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRevoke}
                disabled={isWorking}
                className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {isWorking ? 'Working...' : 'Revoke Link'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            <div className="flex flex-col items-center text-center py-4 space-y-3">
              <div className="p-4 bg-gray-50 rounded-full">
                <Link2 size={28} className="text-gray-300" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">No public link yet</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Create a link to share this board with clients or stakeholders who don't have an
                  account.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Expiry</label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="input-field"
              >
                {expiryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isWorking}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isWorking ? 'Creating...' : 'Create Public Link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
