import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from 'react';

interface LegalModalProps {
    type: 'tos' | 'privacy' | null;
    isOpen: boolean;
    onClose: (open: boolean) => void;
}

export function LegalModal({ type, isOpen, onClose }: LegalModalProps) {
    // We keep a local state of the type to prevent content flashing during the closing animation
    const [stableType, setStableType] = useState<'tos' | 'privacy'>('tos');

    useEffect(() => {
        if (type) {
            setStableType(type);
        }
    }, [type]);

    const isTos = stableType === 'tos';
    const title = isTos ? "Terms of Service" : "Privacy Policy";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-line bg-petal">
                <DialogHeader className="p-6 border-b border-line">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-ink">{title}</DialogTitle>
                    <DialogDescription className="text-ink-soft">
                        Last updated: May 11, 2026
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-ink-soft space-y-4">
                    {isTos ? (
                        <>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">1. Acceptance of Terms</h3>
                                <p>By accessing or using Neighborship, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our service.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">2. Description of Service</h3>
                                <p>Neighborship is a mentorship platform designed to connect students, researchers, and professionals. We facilitate knowledge sharing through profile matching, messaging, and workshops.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">3. User Accounts</h3>
                                <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">4. User Conduct</h3>
                                <p>You agree not to use the service for any unlawful purpose or to solicit others to perform or participate in any unlawful acts. Harassment, abuse, or discrimination of any kind will result in immediate termination of access.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">5. Intellectual Property</h3>
                                <p>The service and its original content, features, and functionality are and will remain the exclusive property of Neighborship and its licensors.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">6. Limitation of Liability</h3>
                                <p>In no event shall Neighborship be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
                            </section>
                        </>
                    ) : (
                        <>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">1. Information Collection</h3>
                                <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with other users.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Account information (email, password)</li>
                                    <li>Profile information (name, bio, skills, interests)</li>
                                    <li>Communication data (messages, workshop participation)</li>
                                </ul>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">2. Use of Information</h3>
                                <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you about your account and usage of the platform.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">3. Information Sharing</h3>
                                <p>We share profile information with other users to facilitate mentorship connections. We do not sell your personal information to third parties.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">4. Data Security</h3>
                                <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">5. Your Choices</h3>
                                <p>You may update or correct your profile information at any time by logging into your account.</p>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-lg font-semibold text-ink">6. Cookies</h3>
                                <p>We use cookies and similar technologies to track activity on our service and hold certain information to improve your experience.</p>
                            </section>
                        </>
                    )}
                </div>
                
                <div className="p-6 border-t border-line flex justify-end">
                    <button 
                        onClick={() => onClose(false)}
                        className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
