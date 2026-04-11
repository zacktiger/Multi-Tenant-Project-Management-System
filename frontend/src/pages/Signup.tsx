import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const signupAction = useAuthStore((s) => s.signupAction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const err = await signupAction({ name, email, password, orgName });

    setLoading(false);
    if (err) {
      setError(err);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold text-gray-900">Start Your Organization</h2>
        <p className="mt-2 text-gray-500">Create a new workspace and invite your team. You will be the first administrator.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700" htmlFor="name">
            Full Name
          </label>
          <input 
            id="name"
            type="text" 
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700" htmlFor="email">
            Email Address
          </label>
          <input 
            id="email"
            type="email" 
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700" htmlFor="password">
            Password
          </label>
          <input 
            id="password"
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700" htmlFor="orgName">
            Company or Organization Name
          </label>
          <input 
            id="orgName"
            type="text" 
            placeholder="Acme, Inc."
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="input-field"
            required
          />
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
            This creates a fresh workspace for your team
          </p>
        </div>

        <p className="text-xs text-gray-500">
          By signing up, you agree to our{' '}
          <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
          <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating workspace...' : 'Start New Organization'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}
