import {createFileRoute, Outlet} from '@tanstack/react-router'
import Header from "#/components/Header.tsx";
import Footer from "#/components/Footer.tsx";
export const Route = createFileRoute('/_unauthorizedLayout')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
      <>
        <Header/>
        <Outlet />
        <Footer/>
      </>
  )
}
