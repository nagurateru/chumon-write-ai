import {
  Building2,
  Award,
  HardHat,
  Home,
  CalendarDays,
  Store,
  PenLine,
  LayoutDashboard,
  FileEdit,
  CreditCard,
  LogOut,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export const TAB_ICONS: Record<string, (props: LucideProps) => JSX.Element> = {
  company:      (p) => <Building2    {...p} />,
  strength:     (p) => <Award        {...p} />,
  construction: (p) => <HardHat      {...p} />,
  modelhouse:   (p) => <Home         {...p} />,
  event:        (p) => <CalendarDays {...p} />,
  store:        (p) => <Store        {...p} />,
  free:         (p) => <PenLine      {...p} />,
}

export const NAV_ICONS = {
  dashboard:       (p: LucideProps) => <LayoutDashboard {...p} />,
  companyProfile:  (p: LucideProps) => <Building2       {...p} />,
  generate:        (p: LucideProps) => <FileEdit        {...p} />,
  pricing:         (p: LucideProps) => <CreditCard      {...p} />,
  logout:          (p: LucideProps) => <LogOut          {...p} />,
}
