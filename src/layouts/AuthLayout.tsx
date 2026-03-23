import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Panel: Brand & Marketing */}
      <div className="md:w-1/2 bg-[#0f172a] p-12 flex flex-col justify-center text-white space-y-8">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
              <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
              <path d="M4 12H20" />
              <rect width="8" height="8" x="8" y="8" rx="2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Project Flow</h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold leading-tight">Master your projects with clarity and precision.</h2>
          <p className="text-slate-400 text-lg">The ultimate workspace for modern teams to collaborate, track, and ship products faster.</p>
        </div>

        <ul className="space-y-4 text-slate-300">
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span>Intelligent task prioritization and tracking</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span>Real-time team collaboration tools</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span>Advanced reporting and insights</span>
          </li>
        </ul>

        <div className="pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm">© 2026 Project Flow Inc. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel: Auth Forms */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
