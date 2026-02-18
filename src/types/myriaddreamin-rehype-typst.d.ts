declare module "@myriaddreamin/rehype-typst" {
  const rehypeTypst: (
    options?: {
      errorColor?: string;
    } | null,
  ) => (tree: unknown, file: unknown) => Promise<void>;

  export default rehypeTypst;
}
