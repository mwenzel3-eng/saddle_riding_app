# Saddle School

A shared React + TypeScript + Vite application for the web and Capacitor iOS.

**Read [START_HERE.md](START_HERE.md) for installation, data limitations and iPhone instructions.**

## Commands

| Command | Purpose |
| --- | --- |
| npm ci | Install the locked dependencies |
| npm run dev | Start the local development server |
| npm test | Validate backup boundaries and date handling |
| npm run build | Type-check and produce dist/ |
| npm run preview | Serve the production build locally |
| npm run ios:sync | Build and copy web output into the existing iOS project |
| npm run ios:open | Open the iOS project in Xcode (Mac) |

## Layout

- src/main.tsx — interface, forms, and navigation
- src/data.ts — entities, record factories and backup schema validation
- src/storage.ts — IndexedDB persistence, atomic record/media updates, photo processing
- src/lessons.ts — six clearly labeled starter guides
- src/style.css — responsive layout and visual system
- src/data.test.ts — backup/date tests
- capacitor.config.ts and ios/ — native app configuration and generated Xcode project
- DEVELOPMENT.md — implementation boundaries and next steps

## Validation

Production TypeScript/Vite build and backup validation tests passed. Browser QA covered creating a horse, saving a linked ride, reloading and checking persistence, and opening/completing a learning guide. Native project generation and web-asset synchronization passed. Native compilation, real iPhone behavior, photo/video format handling, backup restore through the UI, and cloud features were not device-tested here.

## Official references

- https://vite.dev/guide/
- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/basics/workflow
