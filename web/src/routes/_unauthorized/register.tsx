import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Heading, Body, Display } from "@/components/Typography"
import { User, Mail } from 'lucide-react'

// Zod schema for registration form validation
const registerSchema = z.object({
    fullName: z.string().min(1, "Full name is required").min(2, "Full name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z.boolean().refine((val) => val === true, {
        message: "You must agree to the terms",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Route = createFileRoute('/_unauthorized/register')({
    component: RegisterPage,
})

export function RegisterPage() {
    const [formData, setFormData] = useState<Partial<RegisterFormData>>({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: false,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateField = (field: keyof RegisterFormData, value: unknown) => {
        const result = registerSchema.safeParse({ ...formData, [field]: value });
        if (!result.success) {
            const fieldError = result.error.issues.find((e: z.ZodIssue) => e.path[0] === field);
            return fieldError?.message || '';
        }
        return '';
    };

    const handleChange = (field: keyof RegisterFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = registerSchema.safeParse(formData);
        if (!result.success) {
            const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};
            result.error.issues.forEach((error: z.ZodIssue) => {
                const field = error.path[0] as keyof RegisterFormData;
                newErrors[field] = error.message;
            });
            setErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        setErrors({});
    
        // TODO: Implement actual registration API call
        setIsSubmitting(false);
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-[5fr_4fr]">
            {/* Left Column: Editorial Content */}
            <aside className="lg:flex flex-col px-14 py-12 bg-petal border-r border-line relative overflow-hidden">
                <Display className="mb-10 relative z-10">Campus Tutor</Display>

                <div className="island-shell rounded-2xl px-8 py-10 space-y-6 min-h-3/4 relative z-10 rise-in">
                    <Body className="island-kicker">Academic Editorial Excellence</Body>
                    <Display as="h2" className="leading-[1.2] max-w-md">
                        Join our community of academic excellence
                    </Display>
                    <Body className="text-(--color-brand-ink-soft) max-w-md">
                        Connect with top-tier tutors and fellow scholars. Refine your research,
                        master your curriculum, and achieve editorial-grade perfection in your academic work.
                    </Body>

                    {/* Avatar Group */}
                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex -space-x-3">
                            <div className="w-12 h-12 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center overflow-hidden">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center overflow-hidden">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-background bg-accent/20 flex items-center justify-center overflow-hidden">
                                <User className="w-6 h-6 text-accent" />
                            </div>
                        </div>
                        <span className="text-sm text-ink-soft font-medium">Join 2,000+ scholars</span>
                    </div>
                </div>

                {/* Abstract Background Accents */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-2xl opacity-30" />
            </aside>

            {/* Right Column: Registration Form */}
            <main className="flex flex-col justify-start items-center px-6 py-16 sm:px-12">
                <div className="w-full max-w-md rise-in">

                    <div className="text-center md:text-left mb-10">
                        <Heading as="h2" className="mb-2">Create your account</Heading>
                        <Body className="text-muted-foreground">Enter your details to begin your academic journey.</Body>
                    </div>

                    <Card className="w-full island-shell border-line">
                        <CardContent className="pt-4">
                            <form
                                id="register-form"
                                className="space-y-6"
                                onSubmit={handleSubmit}
                            >
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="ml-1">Full Name</Label>
                                    <div className="relative">
                                        <Input
                                            id="fullName"
                                            type="text"
                                            placeholder="Jane Doe"
                                            value={formData.fullName}
                                            onChange={(e) => handleChange('fullName', e.target.value)}
                                            aria-invalid={!!errors.fullName}
                                            className="w-full px-4 py-3 rounded-xl"
                                        />
                                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    </div>
                                    {errors.fullName && (
                                        <p className="text-xs text-destructive ml-1">{errors.fullName}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="ml-1">Email</Label>
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="jane.doe@university.edu"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            aria-invalid={!!errors.email}
                                            className="w-full px-4 py-3 rounded-xl"
                                        />
                                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    </div>
                                    {errors.email && (
                                        <p className="text-xs text-destructive ml-1">{errors.email}</p>
                                    )}
                                </div>

                                {/* Password Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="ml-1">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            aria-invalid={!!errors.password}
                                            className="w-full px-4 py-3 rounded-xl"
                                        />
                                        {errors.password && (
                                            <p className="text-xs text-destructive ml-1">{errors.password}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="ml-1">Confirm password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                            aria-invalid={!!errors.confirmPassword}
                                            className="w-full px-4 py-3 rounded-xl"
                                        />
                                        {errors.confirmPassword && (
                                            <p className="text-xs text-destructive ml-1">{errors.confirmPassword}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Terms Checkbox */}
                                <div className="flex items-start gap-3 mt-2">
                                    <Checkbox
                                        id="terms"
                                        checked={formData.terms}
                                        onCheckedChange={(checked) => handleChange('terms', checked)}
                                    />
                                    <div className="text-sm leading-tight">
                                        <Label htmlFor="terms" className="font-normal cursor-pointer">
                                            I agree to the{" "}
                                            <a
                                                href="#"
                                                className="text-primary hover:underline underline-offset-4"
                                            >
                                                Terms of Service
                                            </a>{" "}
                                            and{" "}
                                            <a
                                                href="#"
                                                className="text-primary hover:underline underline-offset-4"
                                            >
                                                Privacy Policy
                                            </a>.
                                        </Label>
                                        {errors.terms && (
                                            <p className="text-xs text-destructive mt-1">{errors.terms}</p>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </CardContent>

                        <CardFooter className="flex-col gap-2 pt-2">
                            <Button
                                type="submit"
                                form="register-form"
                                className="w-full py-4 font-bold rounded-xl"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Creating account..." : "Create Account"}
                            </Button>

                            <div className="mt-2 pt-2 border-t border-border/10 text-center w-full">
                                <p className="text-primary/70">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="font-bold text-primary hover:underline underline-offset-4 transition-all"
                                    >
                                        Log in
                                    </Link>
                                </p>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
