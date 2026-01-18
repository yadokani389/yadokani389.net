{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
      ];

      imports = [
        inputs.git-hooks.flakeModule
        inputs.treefmt-nix.flakeModule
      ];

      perSystem =
        {
          config,
          pkgs,
          ...
        }:
        {
          pre-commit.settings = {
            src = ./.;
            hooks = {
              actionlint.enable = true;
              prettier.enable = true;
              treefmt.enable = true;
              typos.enable = true;
            };
          };

          treefmt = {
            projectRootFile = "flake.nix";
            programs = {
              prettier = {
                enable = true;
                includes = [
                  "*.astro"
                  "*.cjs"
                  "*.cts"
                  "*.d.cts"
                  "*.d.mts"
                  "*.d.ts"
                  "*.js"
                  "*.json"
                  "*.jsonc"
                  "*.jsx"
                  "*.mjs"
                  "*.mts"
                  "*.ts"
                  "*.tsx"
                ];
              };
              nixfmt.enable = true;
            };
          };

          packages.ci = pkgs.buildEnv {
            name = "ci-dependencies";
            paths = with pkgs; [
              nodejs-slim
              pnpm
              wrangler
            ];
          };

          devShells = {
            default = pkgs.mkShellNoCC {
              inputsFrom = [
                config.pre-commit.devShell
              ];
              packages = with pkgs; [
                nodejs-slim
                pnpm
              ];
            };
          };
        };
    };
}
