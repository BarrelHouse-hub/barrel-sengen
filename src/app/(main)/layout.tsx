import { Suspense } from 'react'
import { Nav, NavBar } from '@/components/nav'

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <Suspense fallback={<NavBar path={null} />}>
        <Nav />
      </Suspense>
    </>
  )
}
