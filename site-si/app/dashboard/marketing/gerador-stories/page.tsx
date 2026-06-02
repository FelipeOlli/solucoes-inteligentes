"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import s from "./gerador-stories.module.css";

declare global {
  interface Window {
    html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

const TAGS = ["OFERTA", "ACHADO DO DIA", "BAIXOU"] as const;
type Tag = typeof TAGS[number];

export default function GeradorStoriesPage() {
  const router = useRouter();

  const [foto, setFoto] = useState<string | null>(null);
  const [fotoNome, setFotoNome] = useState("");
  const [titulo, setTitulo] = useState("Fone Bluetooth JBL Tune 520BT");
  const [precoDe, setPrecoDe] = useState("299,90");
  const [precoPor, setPrecoPor] = useState("179,90");
  const [tag, setTag] = useState<Tag>("OFERTA");
  const [baixando, setBaixando] = useState(false);
  const [h2cPronto, setH2cPronto] = useState(false);

  const storyRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  const num = (v: string) => Number(v.replace(",", "."));

  const desconto = useMemo(() => {
    const d = num(precoDe);
    const p = num(precoPor);
    if (!isNaN(d) && d > 0 && !isNaN(p)) return `-${Math.round((1 - p / d) * 100)}%`;
    return null;
  }, [precoDe, precoPor]);

  const ajustarEscala = useCallback(() => {
    const wrap = previewRef.current;
    if (!wrap) return;
    const scaleX = (wrap.clientWidth - 48) / 1080;
    const scaleY = (wrap.clientHeight - 48) / 1920;
    setScale(Math.min(scaleX, scaleY));
  }, []);

  useEffect(() => {
    ajustarEscala();
    const ro = new ResizeObserver(ajustarEscala);
    if (previewRef.current) ro.observe(previewRef.current);
    window.addEventListener("resize", ajustarEscala);
    return () => { ro.disconnect(); window.removeEventListener("resize", ajustarEscala); };
  }, [ajustarEscala]);

  useEffect(() => {
    if (typeof window.html2canvas === "function") { setH2cPronto(true); return; }
    const script = document.createElement("script");
    script.src = "/vendor/html2canvas.min.js";
    script.onload = () => setH2cPronto(true);
    script.onerror = () => console.error("Falha ao carregar html2canvas");
    document.head.appendChild(script);
  }, []);

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFotoNome(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function blobParaDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function inlinarImagens(el: HTMLElement) {
    const imgs = el.querySelectorAll<HTMLImageElement>("img");
    await Promise.all(Array.from(imgs).map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const blob = await fetch(img.src).then(r => r.blob());
        img.src = await blobParaDataUrl(blob);
      } catch { /* ignora imagens que não carregam */ }
    }));
  }

  async function inlinarFontes(el: HTMLElement) {
    const FONTS_URL = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&family=Titillium+Web:wght@400;700;900&display=swap";
    try {
      const css = await fetch(FONTS_URL).then(r => r.text());
      // regex aceita url(...) e url('...') e url("...")
      const urls = [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com[^'")\s]+)['"]?\)/g)].map(m => m[1]))];
      let cssInlined = css;
      await Promise.all(urls.map(async (url) => {
        try {
          const blob = await fetch(url).then(r => r.blob());
          const dataUrl = await blobParaDataUrl(blob);
          cssInlined = cssInlined.replaceAll(url, dataUrl);
        } catch { /* ignora fonte que falhar */ }
      }));
      const style = document.createElement("style");
      style.textContent = cssInlined;
      // injeta no clone para que o foreignObject SVG encontre os @font-face
      el.prepend(style);
    } catch { /* fallback sem fontes inline */ }
  }

  async function baixarStory() {
    if (!storyRef.current) return;
    if (!h2cPronto || !window.html2canvas) { alert("Aguarde o carregamento e tente novamente."); return; }
    setBaixando(true);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;top:0;left:0;width:1080px;height:1920px;overflow:hidden;z-index:-9999;pointer-events:none;opacity:0;";
    const clone = storyRef.current.cloneNode(true) as HTMLElement;
    clone.style.cssText = "position:absolute;top:0;left:0;transform:none;width:1080px;height:1920px;overflow:hidden;";
    clone.style.setProperty("--verde", "#19cb96");
    clone.style.setProperty("--preto", "#050006");
    clone.style.setProperty("--azul", "#122969");
    clone.style.setProperty("--branco", "#ffffff");
    await Promise.all([inlinarImagens(clone), inlinarFontes(clone)]);
    container.appendChild(clone);
    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const dpr = window.devicePixelRatio || 1;
      const captured = await window.html2canvas(clone, {
        width: 1080, height: 1920, scale: dpr, backgroundColor: "#050006",
        useCORS: true, allowTaint: true, logging: false,
        windowWidth: 1080, windowHeight: 1920, scrollX: 0, scrollY: 0,
        foreignObjectRendering: true,
      });
      const out = document.createElement("canvas");
      out.width = 1080; out.height = 1920;
      out.getContext("2d")!.drawImage(captured, 0, 0, 1080, 1920);
      const a = document.createElement("a");
      const nome = (titulo || "story").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      a.download = `story-si-${nome}.png`;
      a.href = out.toDataURL("image/png");
      a.click();
    } catch (err) {
      alert("Erro ao gerar: " + (err instanceof Error ? err.message : err));
    }
    document.body.removeChild(container);
    setBaixando(false);
  }

  return (
    <>
      <div className={s.root}>
        {/* PAINEL */}
        <aside className={s.painel}>
          <div className={s.marcaTopo}>
            <span className={s.dot} />
            <h1>Gerador de Stories</h1>
          </div>
          <p className={s.sub}>
            Soluções Inteligentes · Ofertas de tecnologia.<br />
            Preencha, ajuste e baixe o Story pronto em 1080×1920.
          </p>

          {/* Foto */}
          <div className={s.grupo}>
            <label>Foto do produto</label>
            <label className={`${s.upload} ${foto ? s.uploadAtivo : ""}`} htmlFor="fileInput">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" style={{ width: 26, height: 26, stroke: "#19cb96", marginBottom: 8 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p>{fotoNome ? `${fotoNome} ✓ (clique pra trocar)` : "Clique para subir a foto"}</p>
              <small>PNG ou JPG — fundo branco fica melhor</small>
            </label>
            <input type="file" id="fileInput" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
          </div>

          {/* Título */}
          <div className={s.grupo}>
            <label>Título do produto</label>
            <textarea className={`${s.input} ${s.textarea}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Fone Bluetooth JBL Tune 520BT" />
          </div>

          {/* Preços */}
          <div className={s.grupo}>
            <label>Preços</label>
            <div className={s.linha2}>
              <input className={s.input} type="text" placeholder="De: 299,90" value={precoDe} onChange={(e) => setPrecoDe(e.target.value)} />
              <input className={s.input} type="text" placeholder="Por: 179,90" value={precoPor} onChange={(e) => setPrecoPor(e.target.value)} />
            </div>
            <p className={s.notaRespiro}>O desconto é calculado sozinho. Use vírgula (ex: 179,90).</p>
          </div>

          {/* Tag */}
          <div className={s.grupo}>
            <label>Etiqueta superior</label>
            <div className={s.toggleRow}>
              {TAGS.map((t) => (
                <button key={t} type="button" className={`${s.chip} ${tag === t ? s.chipAtivo : ""}`} onClick={() => setTag(t)}>
                  {t === "ACHADO DO DIA" ? "ACHADO" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Info publicidade */}
          <div className={s.badgeInfo}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" style={{ width: 16, height: 16, stroke: "#19cb96", flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p>O <b>#publicidade</b> é obrigatório por lei e protege a credibilidade da marca. Já vem embutido no rodapé.</p>
          </div>

          {/* Download */}
          <button type="button" className={s.btnBaixar} onClick={baixarStory} disabled={baixando || !h2cPronto}>
            <svg fill="none" viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: "#04241a", strokeWidth: 2.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {baixando ? "Gerando…" : !h2cPronto ? "Carregando…" : "Baixar Story (PNG)"}
          </button>
          <p className={s.dicaFinal}>Depois de baixar: poste no Instagram e cole o <b>sticker de link</b> nativo no respiro do rodapé.</p>
        </aside>

        {/* PREVIEW */}
        <main className={s.previewWrap} ref={previewRef}>
          {/* wrapper ocupa exatamente o espaço visual da arte escalada */}
          <div ref={wrapperRef} style={{ width: 1080 * scale, height: 1920 * scale, flexShrink: 0, overflow: "hidden" }}>
            <div
              id="story"
              className={s.story}
              ref={storyRef}
              style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
              {/* Circuito decorativo */}
              <svg className={s.circuito} viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#19cb96" strokeWidth="2" fill="none" opacity="0.13">
                  <path d="M880 0 V120 H980 V260 M980 180 H1080" />
                  <path d="M940 0 V80 H1040 V200" />
                  <circle cx="980" cy="260" r="7" fill="#19cb96" stroke="none" />
                  <circle cx="1040" cy="200" r="7" fill="#19cb96" stroke="none" />
                  <path d="M120 1920 V1800 H40 V1660 M40 1740 H0" />
                  <path d="M60 1920 V1840 H160 V1720" />
                  <circle cx="40" cy="1660" r="7" fill="#19cb96" stroke="none" />
                  <circle cx="160" cy="1720" r="7" fill="#19cb96" stroke="none" />
                </g>
              </svg>
              <div className={s.glow} />
              <div className={s.glow2} />

              <div className={s.stHeader}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/logo-branco.svg" alt="Soluções Inteligentes" className={s.stLogo} />
                <div className={s.stTag}>
                <span className={s.stTagLinha} />
                {tag}
                <span className={s.stTagLinha} />
              </div>
              </div>

              {desconto && <div className={s.stSeloWrap}><div className={s.stSelo}>{desconto}</div></div>}

              <div className={s.stFotoBox}>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt="produto" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 30 }} />
                ) : (
                  <div className={s.stFotoVazia}>A foto do produto<br />aparece aqui</div>
                )}
              </div>

              <div className={s.stTitulo}>{titulo}</div>
              <div className={s.stInfo}>
                {precoDe && (
                  <span className={s.stDeWrap}>
                    <span className={s.stDeTexto}>R$ {precoDe}</span>
                  </span>
                )}
                <span className={s.stPorLabel}>por apenas</span>
                <span className={s.stPor}>R$ {precoPor}</span>
              </div>

              <div className={s.stRespiro} />
              <div className={s.stLinkAfiliado}>
                <span className={s.stLinkAfiliadoTxt}>🔗 link de afiliado</span>
              </div>
              <div className={s.stRodape}>
                <span>Achou na <span className={s.arroba}>@solucoesinteligentes_si</span></span>
                <span className={s.stPubliRod}>#publicidade · oferta sujeita a alteração e estoque</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

