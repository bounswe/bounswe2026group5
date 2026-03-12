import {createFileRoute, Link} from '@tanstack/react-router'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {Button} from "#/components/ui/button.tsx";
import {Input} from "#/components/ui/input.tsx";
import {Label} from "#/components/ui/label.tsx";

export const Route = createFileRoute('/_unauthorizedLayout/Login')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <main className="flex flex-row justify-center min-h-[75vh] px-6 py-12">
            <section className="rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14 flex-1 items-center">
                <div className="bg-(--color-brand-surface-strong) min-h-1/2 rounded-xl border px-3 py-6" >
                    <h1 className="mb-5 max-w-3xl leading-[1.02]">
                        Campus Tutor
                    </h1>
                    <p className="mb-8 max-w-2xl text-base sm:text-lg">
                        This App is Awesome
                    </p>
                </div>
            </section>
            <section className="flex justify-center flex-1 items-center">
                <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Login to your account</CardTitle>
                    <CardDescription className="text-sm">
                        Enter your email below to login to your account
                    </CardDescription>
                    <CardAction>
                        <Button variant="link">Sign Up</Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <form id="login-form" onSubmit={(e) => {
                        e.preventDefault()
                        console.log("Submit")}}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input id="password" type="password" required />
                            </div>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full" form="login-form">
                        Login
                    </Button>
                    <Button variant="outline" className="w-full">
                        Login with Google
                    </Button>
                </CardFooter>
                </Card>
            </section>
        </main>
    )
}
