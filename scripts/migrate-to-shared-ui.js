#!/usr/bin/env node

/**
 * Migration script to update imports from local UI components to shared UI
 * This helps migrate from @/components/ui/* to @therai/shared-ui
 */

const replacements = [
  {
    from: "import { Button } from '@/components/ui/button'",
    to: "import { Button } from '@therai/shared-ui'"
  },
  {
    from: 'import { Button } from "@/components/ui/button"',
    to: 'import { Button } from "@therai/shared-ui"'
  },
  {
    from: "import { buttonVariants } from '@/components/ui/button'",
    to: "import { buttonVariants } from '@therai/shared-ui'"
  },
  {
    from: 'import { buttonVariants } from "@/components/ui/button"',
    to: 'import { buttonVariants } from "@therai/shared-ui"'
  },
  {
    from: "import { Button, buttonVariants } from '@/components/ui/button'",
    to: "import { Button, buttonVariants } from '@therai/shared-ui'"
  },
  {
    from: 'import { Button, buttonVariants } from "@/components/ui/button"',
    to: 'import { Button, buttonVariants } from "@therai/shared-ui"'
  }
];

console.log('Migration script created. This would update imports to use shared UI.');
console.log('Run this manually or integrate into build process.');

export { replacements };