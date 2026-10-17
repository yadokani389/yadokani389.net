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
        "aarch64-linux"
        "aarch64-darwin"
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
              treefmt.enable = true;
              prettier = {
                enable = true;
                entry = "pnpm format";
                pass_filenames = false;
              };
              typos.enable = true;
              lint = {
                enable = true;
                entry = "pnpm lint";
                files = "\\.(js|ts|css|astro|svelte)$";
                pass_filenames = false;
              };
              textlint = {
                enable = true;
                entry = "pnpm textlint";
                files = "\\.(md|mdx)$";
                pass_filenames = false;
              };
            };
          };

          checks.pre-commit = pkgs.lib.mkForce (
            config.pre-commit.settings.run.overrideAttrs {
              SKIP = "lint,prettier,textlint";
            }
          );

          treefmt = {
            projectRootFile = "flake.nix";
            settings.global.excludes = [
              ".direnv/**"
              ".astro/**"
              ".cloudflare/**"
              "dist/**"
              "node_modules/**"
              "pnpm-lock.yaml"
            ];
            programs = {
              nixfmt.enable = true;
            };
          };

          packages = {
            ci = pkgs.buildEnv {
              name = "ci-dependencies";
              paths = with pkgs; [
                nodejs_24
                pnpm
              ];
            };
          }
          // pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
            inherit (pkgs) chromium;
          };

          devShells = {
            default = pkgs.mkShellNoCC {
              inputsFrom = [
                config.pre-commit.devShell
              ];
              packages = [ config.packages.ci ];
            };
          };
        };
    };
}
