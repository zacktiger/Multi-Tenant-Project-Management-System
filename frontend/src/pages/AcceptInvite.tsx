import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvitation } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { Loader2, Mail, Lock, User, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import axios from 'axios';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const acceptInviteAction = useAuthStore((s) => s.acceptInviteAction);
  const logoutAction = useAuthStore((s) => s.logoutAction);
  const currentUser = useAuthStore((s) => s.user);

  const [invitation, setInvitation] = useState<{ email: string; organizationName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) return;

    const checkToken = async () => {
      try {
        const res = await getInvitation(token);
        setInvitation(res.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || 'Invalid or expired invitation link');
        } else {
          setError('Invalid or expired invitation link');
        }
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    
    const errorMsg = await acceptInviteAction(token, {
      name: currentUser ? undefined : name,
      password: currentUser ? undefined : password,
    });

    if (errorMsg) {
      toast.error(errorMsg);
      setSubmitting(false);
    } else {
      toast.success(`Successfully joined ${invitation?.organizationName}!`);
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    // Refresh to clear any local state and show the signup/login forms
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Verifying invitation...</p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Invitation Error</h1>
          <p className="text-gray-600">{error || 'This invitation link is no longer valid.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if logged in user matches the invited email
  const isDifferentUser = currentUser && currentUser.email.toLowerCase() !== invitation.email.toLowerCase();
  const needsAccount = !currentUser;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Organization</h1>
          <p className="text-gray-600">
            You've been invited to join <strong>{invitation.organizationName}</strong> as a team member.
          </p>
        </div>

        {isDifferentUser ? (
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-4">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
              <AlertTriangle size={18} />
              Account Mismatch
            </div>
            <p className="text-sm text-red-700 leading-relaxed">
              You are currently logged in as <strong>{currentUser.email}</strong>, but this invitation is for <strong>{invitation.email}</strong>.
            </p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Switch Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invited Email</div>
              <div className="text-gray-900 font-medium">{invitation.email}</div>
            </div>

            {needsAccount && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field pl-10"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                currentUser ? 'Accept & Join Organization' : 'Create Account & Join'
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-100 text-center space-y-2">
          <p className="text-xs text-gray-500">
            This invitation allows you to join an existing organization.
          </p>
          {!currentUser && (
            <p className="text-xs text-gray-400">
              Looking to start your own organization? <a href="/signup" className="text-blue-600 hover:underline">Sign up as a founder</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
