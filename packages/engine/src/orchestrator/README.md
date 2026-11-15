# `orchestrator` Domain

Top-level build evaluation entry point (`calculateBuild`) and default state factory (`createDefaultBuildState`).
As subsequent feature slices are implemented, each domain compiler plugs cleanly into `calculateBuild()`.
