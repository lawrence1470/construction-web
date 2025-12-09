export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'Home', href: '/dashboard' },
  { id: 'projects', label: 'Projects', icon: 'LayoutGrid', href: '/projects' },
  { id: 'tasks', label: 'Tasks', icon: 'Zap', href: '/tasks' },
  { id: 'reports', label: 'Reports', icon: 'Clipboard', href: '/reports' },
];
