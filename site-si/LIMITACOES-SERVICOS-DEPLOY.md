# Limitações – Render, Railway, Vercel e outros

Resumo das limitações dos principais serviços de deploy para referência (planos gratuitos / trial; dados sujeitos a alteração — confira sempre o site oficial).

---

## Visão geral (planos gratuitos / trial)

| Serviço        | Tipo de oferta gratuita | SQLite / arquivo persistente | Ideal para o Site SI?      |
|----------------|---------------------------|-----------------------------|----------------------------|
| **Render**     | Free tier contínuo       | ✅ Sim (Persistent Disk)    | ✅ Sim (com cold start)     |
| **Railway**    | Trial + $1/mês crédito    | ✅ Sim (Volume)             | ✅ Sim (crédito limitado)   |
| **Vercel**     | Hobby (free)              | ❌ Não (serverless)         | ❌ Só se trocar para DB na nuvem |
| **Fly.io**     | Só trial (2h ou 7 dias)   | ✅ Sim (Volume)             | ⚠️ Depois paga             |
| **Netlify**    | Free tier                 | ❌ Não (serverless)        | ❌ Idem Vercel             |
| **Hetzner + EasyPanel** | Você paga o VPS  | ✅ Sim (volume no seu servidor) | ✅ Sem limite do provedor  |

---

## Render

**Free tier (Web Service):**
- **Cold start:** serviço desliga após ~15 min sem acesso; primeiro request pode levar **30–60 s** para subir.
- **Recursos:** ~0,1 vCPU compartilhado, 512 MB RAM.
- **Uso:** ~750 horas de instância/mês (um serviço 24/7 cabe, mas fica “dormindo”).
- **Banda:** ~100 GB/mês.
- **Build:** ~500 min/mês.
- **Banco:** PostgreSQL free expira em 30–90 dias (dados apagados). **Persistent Disk** no free: verifique na doc atual; em alguns planos free não há disco persistente para Web Services.
- **Sem** Redis no free.

**Limitações práticas para o Site SI:** Cold start atrapalha se quiser resposta imediata; precisa de Persistent Disk para SQLite (se disponível no seu plano). UptimeRobot (ping a cada 10 min) reduz cold start, mas o serviço pode não “dormir” dentro das 750 h dependendo do uso.

---

## Railway

**Free trial:** ~US$ 5 em crédito (uma vez) ou 30 dias; depois vira Free plan.
**Free plan (após trial):**
- **US$ 5 de crédito no trial;** depois **US$ 1 de crédito por mês** (não acumula).
- **Projetos:** 1 no free; 5 durante o trial.
- **Recursos no trial:** até 1 GB RAM, vCPU compartilhada, até 5 serviços por projeto.
- **Billing:** pay-as-you-go; quando o crédito acaba, o serviço para (ou pede cartão para continuar).
- **Volume:** suportado (persistência para SQLite).

**Limitações práticas para o Site SI:** Com US$ 1/mês o tempo de runtime é curto; um Next.js + SQLite 24/7 tende a estourar o crédito. Bom para testar; para produção contínua costuma ser pago.

---

## Vercel

**Hobby (free):**

- **Uso:** 4 CPU-hours, 360 GB-hours de memória, 1 milhão de invocações de serverless, 100 GB de transferência, etc.
- **Build:** 1 build concorrente, até ~45 min, 100 deploys/dia.
- **Funções:** duração máxima padrão 10 s (até 60 s configurável no Hobby).
- **Armazenamento:** ambiente **efêmero**; **sem sistema de arquivos persistente** entre invocações.
- **SQLite:** **não suportado** em produção: sistema de arquivos read-only (exceto `/tmp`), instâncias não compartilham disco, dados não persistem entre builds/invocações.

**Limitações práticas para o Site SI:** Para usar Vercel com o Site SI seria preciso **trocar SQLite por um banco na nuvem** (ex.: Vercel Postgres, Neon, Turso, PlanetScale). Hobby é só uso não comercial.

---

## Fly.io

**Free trial (novos usuários):**
- **2 horas de máquina** ou **7 dias**, o que acabar primeiro.
- Máquinas de trial desligam após 5 min de inatividade.
- Recursos: até 2 vCPUs, 4 GB RAM por máquina, 20 GB de volume, até 10 máquinas.

**Após o trial:** modelo **pay-as-you-go**; não há free tier contínuo. Faturas menores que US$ 5 podem ser zeradas (política pode mudar).

**Limitações práticas para o Site SI:** Bom para testar com SQLite + volume; depois é pago. Quem tinha conta antes de out/2024 pode ter allowances antigos (3 VMs, 3 GB storage, etc.).

---

## Netlify

**Free tier:**
- **Funções:** ~125 mil invocações/mês; Edge Functions ~1 milhão/mês.
- **Build:** ~300 min/mês.
- **Banda:** ~100 GB/mês.
- **Storage:** ~10 GB.
- Ambiente **serverless**: sem disco persistente compartilhado para SQLite.

**Limitações práticas para o Site SI:** Igual ao Vercel: não dá para usar SQLite em produção; precisaria de banco externo. Foco em front estático + serverless.

---

## Outros serviços (resumo)

- **Coolify / CapRover / Dokku:** você hospeda no **seu servidor** (ex.: Hetzner). Limites são do VPS e do que você instalar; suporta Docker, volumes, SQLite.
- **Hetzner + EasyPanel (seu caso):** limites vêm do plano do VPS (CPU, RAM, disco, tráfego). Sem cold start do Render, sem limite de crédito do Railway, sem restrição de SQLite da Vercel.

---

## Resumo para o Site SI (Next.js + Prisma + SQLite)

| Necessidade              | Render        | Railway       | Vercel        | Hetzner + EasyPanel |
|--------------------------|---------------|---------------|---------------|---------------------|
| SQLite persistente       | ✅ (com disk) | ✅ (volume)   | ❌            | ✅                  |
| Sem cold start           | ❌            | ✅            | N/A (serverless) | ✅               |
| Custo zero contínuo      | ✅            | ⚠️ (~$1/mês pouco) | ✅ (Hobby) | ❌ (paga VPS)       |
| Atualizar com push       | ✅            | ✅            | ✅            | ✅                  |
| Controle total           | ❌            | ❌            | ❌            | ✅                  |

- **Quer grátis e aceita cold start ou pouco tempo de runtime:** Render (free) ou Railway (trial + pouco crédito).
- **Quer sempre rápido e previsível, sem depender de limite de crédito:** Hetzner + EasyPanel (seu plano atual).
- **Quer usar Vercel/Netlify:** trocar SQLite por banco gerenciado (Neon, Turso, Vercel Postgres, etc.).

Confira sempre os preços e limites atualizados nos sites oficiais (Render, Railway, Vercel, Fly.io, Netlify).
