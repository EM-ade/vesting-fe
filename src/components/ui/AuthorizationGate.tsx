/**
 * Authorization Gate Component
 * Smooth animated overlay for requesting wallet signatures
 */

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Shield, Lock, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthorizationGateProps {
  isVisible: boolean;
  isAuthorizing: boolean;
  isAuthorized: boolean;
  onAuthorize: () => Promise<void>;
  title?: string;
  description?: string;
  requiresSignature?: boolean;
  className?: string;
}

export function AuthorizationGate({
  isVisible,
  isAuthorizing,
  isAuthorized,
  onAuthorize,
  title = "Authorization Required",
  description = "Please sign the message to verify your identity and authorize this action.",
  requiresSignature = true,
  className,
}: AuthorizationGateProps) {
  return (
    <AnimatePresence>
      {isVisible && !isAuthorized && (
        <motion.div
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Authorization Card */}
          <motion.div
            className="bg-slate-900/95 border border-purple-500/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              delay: 0.1 
            }}
          >
            {/* Icon */}
            <motion.div
              className="flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 20,
                delay: 0.2 
              }}
            >
              <div className="relative">
                {/* Pulsing background */}
                <motion.div
                  className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Icon container */}
                <div className="relative bg-purple-500/10 p-4 rounded-full border border-purple-500/20">
                  {isAuthorizing ? (
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  ) : (
                    <Shield className="w-8 h-8 text-purple-400" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h3
              className="text-2xl font-bold text-white text-center mb-3 font-space"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h3>

            {/* Description */}
            <motion.p
              className="text-white/60 text-center mb-6 text-sm leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {description}
            </motion.p>

            {/* Security Info */}
            {requiresSignature && (
              <motion.div
                className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-blue-300 text-sm font-medium">
                      Secure Authorization
                    </p>
                    <p className="text-blue-300/60 text-xs leading-relaxed">
                      You'll be asked to sign a message with your wallet. This proves ownership without exposing your private keys.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Button
                onClick={onAuthorize}
                disabled={isAuthorizing}
                className={cn(
                  "w-full h-12 text-base font-semibold transition-all",
                  isAuthorizing
                    ? "bg-purple-500/50 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600 hover:scale-105"
                )}
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Waiting for signature...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Sign to Continue
                  </>
                )}
              </Button>
            </motion.div>

            {/* Footer note */}
            <motion.p
              className="text-white/30 text-xs text-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              This action is secure and doesn't cost any gas fees
            </motion.p>
          </motion.div>
        </motion.div>
      )}

      {/* Success state - brief animation before hiding */}
      {isAuthorized && isVisible && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 max-w-md w-full mx-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-white text-center font-space">
                Authorized!
              </h3>
              <p className="text-white/60 text-center text-sm mt-2">
                You can now proceed...
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
