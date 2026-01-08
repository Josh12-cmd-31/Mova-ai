
import React, { useState } from 'react';
import { loginWithGoogle } from '../services/firebase';

const Login: React.FC = () => {
  const [error, setError] = useState<{ message: string; domain?: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      // Specifically handle unauthorized domain error to help the user configure Firebase
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

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">{error.message}</p>
                {error.domain ? (
                  <p className="text-slate-400 text-[10px] leading-relaxed text-left">
                    Please add <code className="text-indigo-400 font-mono bg-indigo-400/10 px-1 rounded mx-0.5">{error.domain}</code> to the <span className="text-slate-200">Authorized domains</span> list in your Firebase Console (Authentication > Settings).
                  </p>
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
