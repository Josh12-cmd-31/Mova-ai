
import React, { useState } from 'react';
import { loginWithGoogle } from '../services/firebase';

interface LoginProps {
  onGuestLogin?: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onGuestLogin }) => {
  const [error, setError] = useState<{ message: string; domain?: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError({
          message: "Domain Authorization Required",
          domain: window.location.hostname
        });
      } else {
        setError({ message: "Unable to sign in. Please try again." });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoMode = () => {
    if (onGuestLogin) {
      onGuestLogin({
        uid: 'guest-creator-' + Math.random().toString(36).substr(2, 9),
        displayName: 'Guest Creator',
        email: 'guest@mova.ai',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mova'
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070b14] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md px-6 z-10 animate-fade-in">
        <div className="glass-panel p-10 rounded-[2.5rem] border-slate-800/50 shadow-2xl text-center">
          <div className="mb-8 w-20 h-20 rounded-3xl creative-gradient flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto transform rotate-12">
            <i className="fa-solid fa-bolt-lightning text-3xl text-white"></i>
          </div>
          
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-white">MOVA AI</h1>
          <p className="text-slate-400 text-sm mb-10 font-medium">Your Creative Powerhouse Awaits</p>

          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-4 px-6 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
              ) : (
                <i className="fa-brands fa-google text-lg"></i>
              )}
              Continue with Google
            </button>

            <button 
              onClick={handleDemoMode}
              className="w-full py-3 px-6 bg-slate-800/50 text-slate-300 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <i className="fa-solid fa-user-secret text-sm"></i>
              Enter as Guest (Demo Mode)
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-circle-exclamation text-red-400 text-[10px]"></i>
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{error.message}</p>
                </div>
                {error.domain ? (
                  <div className="text-left">
                    <p className="text-slate-400 text-[10px] leading-relaxed mb-3">
                      This domain isn't authorized in your Firebase Console yet. You can use <strong>Demo Mode</strong> above to start immediately, or add this domain:
                    </p>
                    <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between border border-white/5">
                      <code className="text-indigo-400 text-[10px] font-mono truncate">{error.domain}</code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(error.domain!)}
                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                      >
                        <i className="fa-solid fa-copy"></i>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-[10px] leading-relaxed">{error.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800/50">
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-indigo-400 font-bold text-lg">3.1</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Engine</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-bold text-lg">4K</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Visuals</div>
              </div>
              <div className="text-center">
                <div className="text-pink-400 font-bold text-lg">∞</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Stories</div>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
          Empowering creators worldwide
        </p>
      </div>
    </div>
  );
};

export default Login;
