# Zion Chat Client

## Install

Run from repository root:

```bash
npm install
cd client
npm install
```

## 3D Hero Section Dependencies

```bash
cd client
npm install @react-three/fiber@9.6.0 three@0.183.2 @react-three/drei@10.7.7 @react-three/rapier@2.2.0 @react-three/postprocessing@3.0.4 postprocessing@6.39.0
```

## Run

```bash
cd ..
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- The immersive welcome hero lives in `client/src/components/hero`.
- The `Text3D` font is bundled locally at `client/public/fonts/helvetiker_regular.typeface.json`.
- The scene uses zero-gravity Rapier physics, pointer-based repel impulses, dark HDRI environment lighting, bloom, and depth of field.
