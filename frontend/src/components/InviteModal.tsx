import { useState } from 'react';
import { X, Mail, UserPlus, Copy, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { inviteOrgMember } from '../api/workspace.api';
import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import axios from 'axios';

interface InviteModalProps {
  onClose: () => void;
}

export default function InviteModal({ onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const organization = useAuthStore((s) => s.organization);
  const orgId = organization?.id;

  const { fetchMembers } = useStore();

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;
    if (!orgId) {
      toast.error('Organization not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await inviteOrgMember(orgId, email.trim(), role);
      const token = data.data.token;
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      
      toast.success(`Invitation created for ${email}`);

      // Refresh members list if displayed
      if (orgId) {
        fetchMembers(orgId);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 409) {
          toast.error('This person is already a member.');
        } else {
          toast.error('Failed to send invite');
        }
      } else {
        toast.error('Failed to send invite');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <UserPlus size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {inviteLink ? 'Share Invitation' : 'Invite Team Member'}
              </h2>
              <p className="text-sm text-gray-500">
                {inviteLink ? 'Anyone with this link can join your organization' : 'Create an invitation link to join your organization'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {inviteLink ? (
          <div className="space-y-6 py-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Invitation Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 truncate font-mono">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <ExternalLink size={16} />
                No Email Service Configured
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                We couldn't send an email directly. Please copy the link above and share it manually with the invited member.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'viewer')}
                className="input-field"
              >
                <option value="member">Member — can create and edit</option>
                <option value="viewer">Viewer — read-only access</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creating Link...' : 'Create Invite Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
