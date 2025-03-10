import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Cpu,
  Globe,
  Eye,
  Shield,
  Rocket,
  Box,
  Search,
  Palette,
  BookOpen,
  FileText,
  Newspaper,
  Menu,
  X,
} from "lucide-react";
import UserProfile from "@/components/ui/UserProfile";
/**
 * Main Header component that includes the mobile menu toggle and the slide-in menu.
 */
export default function HeaderMobile() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-sm z-50 w-full bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo or brand could go here */}
        <div className="text-xl font-bold">My Brand</div>

        {/* Hamburger button to open the menu */}
        <button
          onClick={() => setMenuOpen(true)}
          className="text-black hover:text-gray-700 transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* AnimatePresence will handle mounting/unmounting of the mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Overlay behind the menu */}
            <motion.div
              className="fixed inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Slide-in panel for the menu */}
            <motion.nav
              className="fixed top-0 right-0 w-80 max-w-full h-full bg-white shadow-lg flex flex-col z-50"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Close button */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  {/* You can place a small brand or text here if you like */}
                  <span className="text-lg font-semibold">Menu</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-black hover:text-gray-700 transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Sign Up / Log In buttons at the top (like Vercel) */}
              <div className="flex flex-col gap-2 p-4 border-b">
                <UserProfile/>
              </div>

              {/* Our actual nav items (collapsible) */}
              <div className="flex-1 overflow-y-auto">
                <MobileNavItems />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

/**
 * Renders the actual navigation items (Products, Solutions, Resources, etc.)
 * in a collapsible/accordion style for mobile.
 */
function MobileNavItems() {
  // same structure as your code
  const NAV_ITEMS: NavItemProps[] = [
    {
      id: 1,
      label: "Products",
      subMenus: [
        {
          title: "DX Platform",
          items: [
            {
              label: "Previews",
              description: "Helping teams ship 6× faster",
              icon: Cpu,
            },
            {
              label: "AI",
              description: "Powering breakthroughs",
              icon: Search,
            },
          ],
        },
        {
          title: "Managed Infrastructure",
          items: [
            {
              label: "Rendering",
              description: "Fast, scalable, and reliable",
              icon: Globe,
            },
            {
              label: "Observability",
              description: "Trace every step",
              icon: Eye,
            },
            {
              label: "Security",
              description: "Scale without compromising",
              icon: Shield,
            },
          ],
        },
        {
          title: "Open Source",
          items: [
            {
              label: "Next.js",
              description: "The native Next.js platform",
              icon: Rocket,
            },
            {
              label: "Turborepo",
              description: "Speed with Enterprise scale",
              icon: Box,
            },
            {
              label: "AI SDK",
              description: "The AI Toolkit for TypeScript",
              icon: Palette,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      label: "Solutions",
      subMenus: [
        {
          title: "Use Cases",
          items: [
            {
              label: "AI Apps",
              description: "Deploy at the speed of AI",
              icon: Cpu,
            },
            {
              label: "Composable Commerce",
              description: "Power storefronts that convert",
              icon: Box,
            },
            {
              label: "Marketing Sites",
              description: "Launch campaigns fast",
              icon: Rocket,
            },
            {
              label: "Multi-tenant Platforms",
              description: "Scale apps with one codebase",
              icon: Globe,
            },
            {
              label: "Web Apps",
              description: "Ship features, not infrastructure",
              icon: Search,
            },
          ],
        },
        {
          title: "Users",
          items: [
            {
              label: "Platform Engineers",
              description: "Automate away repetition",
              icon: Cpu,
            },
            {
              label: "Design Engineers",
              description: "Deploy for every idea",
              icon: Palette,
            },
          ],
        },
      ],
    },
    {
      id: 3,
      label: "Resources",
      subMenus: [
        {
          title: "Tools",
          items: [
            {
              label: "Resource Center",
              description: "Today's best practices",
              icon: BookOpen,
            },
            {
              label: "Marketplace",
              description: "Extend and automate workflows",
              icon: Search,
            },
            {
              label: "Templates",
              description: "Jumpstart app development",
              icon: FileText,
            },
            {
              label: "Guides",
              description: "Find help quickly",
              icon: BookOpen,
            },
            {
              label: "Partner Finder",
              description: "Get help from solution partners",
              icon: Search,
            },
          ],
        },
        {
          title: "Company",
          items: [
            {
              label: "Customers",
              description: "Trusted by the best teams",
              icon: Newspaper,
            },
            {
              label: "Blog",
              description: "The latest posts and changes",
              icon: FileText,
            },
            {
              label: "Changelog",
              description: "See what shipped",
              icon: BookOpen,
            },
            {
              label: "Press",
              description: "Read the latest news",
              icon: Newspaper,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      label: "Enterprise",
      link: "#",
    },
    {
      id: 5,
      label: "Docs",
      link: "#",
    },
    {
      id: 6,
      label: "Pricing",
      link: "#",
    },
    // If you'd like to add "Contact" to replicate Vercel's screenshot:
    // { id: 7, label: "Contact", link: "#" },
  ];

  const [openItem, setOpenItem] = useState<string | null>(null);

  // Toggle a main menu item open/closed
  const handleToggle = (label: string | null) => {
    setOpenItem((prev) => (prev === label ? null : label));
  };

  return (
    <ul className="flex flex-col">
      {NAV_ITEMS.map((nav) => (
        <li key={nav.id} className="border-b last:border-b-0">
          {/* If there's a link but no subMenus, just render a direct link */}
          {!nav.subMenus ? (
            <a
              href={nav.link ?? "#"}
              className="block py-3 px-4 text-sm font-medium text-black hover:bg-gray-50"
            >
              {nav.label}
            </a>
          ) : (
            <>
              {/* Collapsible button for items that have subMenus */}
              <button
                onClick={() => handleToggle(nav.label)}
                className="w-full flex items-center justify-between py-3 px-4 text-left text-sm font-medium text-black hover:bg-gray-50"
              >
                <span>{nav.label}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openItem === nav.label ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Submenu items */}
              <AnimatePresence>
                {openItem === nav.label && nav.subMenus && (
                  <motion.div
                    className="overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {nav.subMenus.map((group) => (
                      <div key={group.title} className="px-6 pb-3 pt-1">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                          {group.title}
                        </h3>
                        <ul className="flex flex-col space-y-3">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <li key={item.label}>
                                <a
                                  href="#"
                                  className="flex items-center gap-3 text-sm group"
                                >
                                  <div className="p-2 rounded-md bg-gray-100 text-black group-hover:bg-gray-200 transition-colors">
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{item.label}</p>
                                    <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                                      {item.description}
                                    </p>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Types
 */
type SubItem = {
  label: string;
  description: string;
  icon: React.ElementType;
};

type SubMenu = {
  title: string;
  items: SubItem[];
};

type NavItemProps = {
  id: number;
  label: string;
  subMenus?: SubMenu[];
  link?: string;
};
