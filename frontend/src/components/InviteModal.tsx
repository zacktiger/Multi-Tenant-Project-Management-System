import { useState } from 'react';
import { X, Mail, UserPlus } from 'lucide-react';
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

  const organization = useAuthStore((s) => s.organization);
  const orgId = organization?.id;

  const { fetchMembers } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;
    if (!orgId) {
      toast.error('Organization not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      await inviteOrgMember(orgId, email.trim(), role);
      toast.success('Invitation sent');

      // Refresh members list if displayed
      if (orgId) {
        fetchMembers(orgId);
      }

      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          toast.error('User not found. They must sign up first.');
        } else if (status === 409) {
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
              <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
              <p className="text-sm text-gray-500">Send an invitation to join your organization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

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
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
