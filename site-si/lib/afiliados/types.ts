export type Marketplace = "ML" | "MAGALU";

export type ProdutoBusca = {
  marketplace: Marketplace;
  externalId: string;
  titulo: string;
  imagemUrl: string | null;
  preco: number | null;
  urlOriginal: string;
  urlAfiliado: string;
};
