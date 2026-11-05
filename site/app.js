// @ts-check

/**
 * Elementos com tipo específico usados pelo painel (os demais são HTMLElement).
 * @typedef {{
 *   'btn-iniciar': HTMLButtonElement, 'btn-parar': HTMLButtonElement,
 *   'cfg-concorrencia': HTMLInputElement, 'cfg-iniciar-ao-ligar': HTMLInputElement, 'cfg-hd': HTMLInputElement,
 *   'cfg-hd-escolher': HTMLButtonElement, 'pasta-subir': HTMLButtonElement, 'pasta-modal': HTMLDialogElement, 'pasta-nova': HTMLInputElement, 'form-config': HTMLFormElement, 'an-uf': HTMLInputElement,
 *   'an-sinal': HTMLSelectElement, 'vg-zona': HTMLSelectElement, 'vg-disp-uf': HTMLSelectElement, 'vg-disp-cand': HTMLSelectElement, 'an-modal': HTMLDialogElement, 'gl-modal': HTMLDialogElement, 'an-ranking': HTMLTableElement,
 * }} Ids
 */

/**
 * GET /api/eventos (SSE)
 * @typedef {{ uf: string, status: string, total: number, concluidas: number, erros: number,
 *   semArquivos: number, indisponiveis?: number, bytes: number | null, pausada: boolean }} UfEstado
 * @typedef {{
 *   coleta: { rodando: boolean, ufAtual?: string | null, municipioAtual?: string | null,
 *     motivoParada?: string | null, velocidadeBps: number | null, etapa?: Etapa | null },
 *   configuracao: unknown, manifestErro?: string | null,
 *   totais: { bytes: number | null, concluidas: number, secoes: number },
 *   disco: { projecaoBytes: number | null, projecaoPreliminar?: boolean, livres: number | null },
 *   ufs: UfEstado[],
 *   errosSecoes: { uf: string, pleito: string, mun: string, zona: string, secao: string, erro: string }[],
 *   gruposErros?: { causa: string, n: number, exemplos: { uf: string, pleito: string, mun: string, zona: string, secao: string }[] }[],
 *   eventos: { nivel: string, ts: string | number, uf?: string | null, msg: string }[],
 * }} Estado
 */

/**
 * GET /api/config
 * @typedef {{ min: number, max: number, maxLength?: number, alerta?: number }} Limite
 * @typedef {{ cd: string, nome: string, turno: number, cargos: string[] }} Eleicao
 * @typedef {{ cd: string, ciclo: string, data: string, eleicoes: Eleicao[] }} Pleito
 * @typedef {Record<string, any>} Opcoes opções de coleta (concorrencia, http.*, limites…), acessadas por caminho
 * @typedef {{
 *   atual: (Opcoes & { pleitos: string[], ufs: string[], ciclo: string, concorrencia: number, dados?: string }) | null,
 *   disponiveis: { pleitos: Pleito[], ufs: string[] },
 *   padroes: Opcoes,
 *   limites: Record<string, Limite>,
 *   somenteLeitura: { dadosFixo?: string | null, base: string, ambiente: string, porta: number },
 * }} Config
 * @typedef {Opcoes & { pleitos: string[], ufs: string[], concorrencia: number, http: Record<string, any> }} FormConfig
 */

/**
 * /api/analise/*
 * @typedef {{ uf: string, ok: number, secoes: number, achados?: number | null,
 *   secoesComAchados?: number | null, analisadoEm?: string | null }} AnaliseUf
 * @typedef {{ uf: string, estado: string, etapa?: string, origem?: string, progresso?: string, percentual?: number | null,
 *   secoes?: { feitas: number, total: number } | null, municipios?: { feitos: number, total: number } | null, erro?: string }} Job
 * @typedef {{ mun: string, zona: string, secao: string, pontuacao: number, sinais: string[],
 *   explicacoes?: string | string[] | null }} SecaoRanking
 * @typedef {{ sinais: { sinal: string, n: number }[], secoes: SecaoRanking[] }} Ranking
 * @typedef {{ pleito: number, sinal: string, valor: number, referencia: number, pontuacao: number,
 *   detalhe?: string | null, explicacoesCandidatas?: string | string[] | null }} Achado
 * @typedef {{ inicio: string, votos: number, biometria: number, mesario: number, anoNascimento: number }} Intervalo
 * @typedef {{ pleito: number, votos: number, primeiroVoto: string, ultimoVoto: string, intervalos: Intervalo[] }} LinhaDoTempo
 * @typedef {{ pleito: number, tipo: string, numero?: number, votos: number }} VotoPresidente
 * @typedef {{ pleito: number, [campo: string]: any }} TurnoSecao colunas da seção extraída (aptos, status, local…)
 * @typedef {{ mun: string, zona: string, secao: string, horasParaBrasilia: number, turnos: TurnoSecao[],
 *   achados: Achado[], presidente: VotoPresidente[], linhaDoTempo: LinhaDoTempo[], balanco: Balanco | null }} DetalheSecao
 * @typedef {{ chave: string, ganho: number, deNovos: [number, number], deLiberados: [number, number] }} Ganho
 * @typedef {{ fontes: { chave: string, votos: number }[], novos: number, liberados: number, ganhos: Ganho[], fecha: boolean }} Balanco
 */

/**
 * @template {string} K
 * @param {K} id
 * @returns {K extends keyof Ids ? Ids[K] : HTMLElement}
 */
const $ = (id) => /** @type {any} */ (document.getElementById(id));

// Site público (GitHub Pages): só a aba Análise, com as consultas rodando no navegador sobre o pacote publicado.
const SITE = document.documentElement.dataset.site === '1';
/** @param {unknown} s */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** @param {number} n */
const num = (n) => n.toLocaleString('pt-BR');
/** @type {Record<string, string>} */
const ROTULO = {
  aguardando: 'Aguardando', baixando: 'Baixando', pausada: 'Pausada', pausando: 'Pausando…',
  baixado: 'Baixado', baixado_com_erros: 'Concluída c/ erros',
};

/** @param {number | null | undefined} b */
function fmtBytes(b) {
  if (b == null) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < unidades.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i ? 1 : 0)} ${unidades[i]}`;
}

/** @param {UfEstado} u */
function linhaUf(u) {
  const feitas = u.concluidas + u.erros;
  const pct = u.total ? Math.floor((feitas / u.total) * 100) : 0;
  // UF que terminou com seções em erro: "Tentar de novo" a põe de volta na fila (rota de retomar), logo após a UF atual.
  const refazer = !u.pausada && u.status === 'baixado_com_erros';
  const acao = u.pausada || refazer ? 'iniciar' : 'pausar';
  const dica = [`${num(u.erros)} com erro`, `${num(u.semArquivos)} sem dados`,
    `${num(u.indisponiveis ?? 0)} não publicados (listados no índice do TSE, mas ausentes; não afetam a análise)`,
    `${fmtBytes(u.bytes)} baixados`].join('\n');
  const botao = el('button', { type: 'button', className: 'pequeno', textContent: u.pausada ? 'Retomar' : refazer ? 'Tentar de novo' : 'Pausar',
    title: u.pausada ? 'retoma a coleta (todas as UFs não pausadas)'
      : refazer ? `baixa de novo as ${num(u.erros)} seções com erro desta UF: entra na fila logo após a UF que está baixando (com a coleta parada, inicia a coleta)`
      : 'pausa esta UF' });
  botao.dataset.uf = u.uf;
  botao.dataset.acao = acao;
  const extras = [el('span', { textContent: `${fmtBytes(u.bytes)} · ${num(u.semArquivos)} sem dados` })];
  if (u.erros) extras.push(el('span', { className: 'selo erro', textContent: `${num(u.erros)} erros`, title: 'seções com erro' }));
  if (u.indisponiveis) extras.push(el('span', { className: 'selo aviso', textContent: `${num(u.indisponiveis)} não publicados`, title: 'listados no índice do TSE mas não publicados; não afeta a análise' }));
  return el('tr', { className: u.status, title: dica },
    el('td', { className: 'uf', textContent: u.uf.toUpperCase() }),
    el('td', {}, el('span', { className: `status st-${u.status}`, textContent: ROTULO[u.status] ?? u.status })),
    el('td', { className: 'progresso' },
      el('div', { className: 'linha-prog' }, el('progress', { max: 100, value: pct }), el('span', { className: 'pct', textContent: `${pct}%` })),
      el('div', { className: 'extras' }, ...extras)),
    el('td', { className: 'num', textContent: `${num(u.concluidas)} / ${num(u.total)}` }),
    el('td', {}, botao));
}

/** @type {Estado | null} */
let ultimoEstado = null;

/**
 * Etapa longa do município em que nada é baixado (o painel mostraria só 0 B/s).
 * @typedef {{ nome: 'listando' | 'conferindo' | 'empacotando', feito: number, total: number }} Etapa
 * @param {Etapa | null | undefined} etapa
 */
function textoEtapa(etapa) {
  if (!etapa) return '';
  const pct = etapa.total ? Math.min(100, Math.floor((etapa.feito / etapa.total) * 100)) : 0;
  if (etapa.nome === 'listando') return `listando os arquivos baixados antes de conferir: zona ${num(etapa.feito)} de ${num(etapa.total)} (${pct}%)`;
  return etapa.nome === 'conferindo'
    ? `conferindo os arquivos baixados antes de empacotar: ${num(etapa.feito)} / ${num(etapa.total)} (${pct}%)`
    : `montando o zip do município: ${fmtBytes(etapa.feito)} / ${fmtBytes(etapa.total)} (${pct}%)`;
}

/** @param {Estado} e */
function render(e) {
  ultimoEstado = e;
  const c = e.coleta;
  const semConfig = !e.configuracao;
  if (semConfig && !location.hash) trocarAba('configuracao');
  const parcial = [`${num(e.totais.concluidas)} / ${num(e.totais.secoes)} seções`, fmtBytes(e.totais.bytes), `${fmtBytes(c.velocidadeBps)}/s`];
  $('situacao').textContent = semConfig
    ? 'Sem configuração: escolha pleitos e UFs em "Configuração" e aplique'
    : c.rodando
    ? [`Coletando ${c.ufAtual?.toUpperCase() ?? ''}${c.municipioAtual ? ` ${c.municipioAtual}` : ''}`,
      ...(c.etapa ? [`${textoEtapa(c.etapa)} (sem downloads nesta etapa)`] : []), ...parcial].join(' · ')
    : `Parada${c.motivoParada ? `: ${c.motivoParada}` : ''} · ${parcial.slice(0, 2).join(' · ')}`;
  $('situacao').classList.remove('erro');
  $('manifest-erro').hidden = !e.manifestErro;
  $('manifest-erro').textContent = e.manifestErro ? `Manifest com erro de gravação (HD desconectado?): ${e.manifestErro}` : '';
  $('btn-iniciar').hidden = c.rodando || semConfig;
  $('btn-parar').hidden = !c.rodando;
  $('btn-iniciar').disabled = c.rodando;
  $('btn-parar').disabled = !c.rodando;
  $('velocidade').textContent = c.velocidadeBps == null ? '—' : `${fmtBytes(c.velocidadeBps)}/s`;
  $('baixado').textContent = fmtBytes(e.totais.bytes);
  $('projecao').textContent = fmtBytes(e.disco.projecaoBytes);
  $('projecao-nota').textContent = e.disco.projecaoPreliminar ? 'preliminar' : '\u00a0';
  $('livre').textContent = fmtBytes(e.disco.livres);
  $('secoes-pct').textContent = e.totais.secoes ? `${Math.floor((e.totais.concluidas / e.totais.secoes) * 100)}%` : '—';
  $('secoes').textContent = `${num(e.totais.concluidas)} / ${num(e.totais.secoes)}`;
  $('ufs').replaceChildren(...e.ufs.map(linhaUf));
  const grupos = e.gruposErros ?? [];
  const nErros = grupos.reduce((t, g) => t + g.n, 0);
  $('erros-bloco').hidden = grupos.length === 0;
  $('erros-resumo').textContent = `Ver erros (${num(nErros)})`;
  $('erros').replaceChildren(...grupos.map((g) =>
    el('details', { className: 'grupo-erro' },
      el('summary', {}, el('span', { className: 'selo erro', textContent: num(g.n) }), ` ${g.causa}`),
      el('ul', {}, ...g.exemplos.map((s) =>
        el('li', { textContent: `${s.uf.toUpperCase()} ${s.pleito} mun ${s.mun} zona ${s.zona} seção ${s.secao}` }))))));
  $('eventos-resumo').textContent = `Ver eventos (${num(e.eventos.length)})`;
  $('eventos').replaceChildren(...e.eventos.map((ev) =>
    el('li', { className: ev.nivel }, el('time', { textContent: new Date(ev.ts).toLocaleString('pt-BR') }),
      ` ${ev.uf?.toUpperCase() ?? ''} ${ev.msg}`)));
  renderAnaliseUfs();
}

/** @param {string} msg */
function avisar(msg) {
  $('situacao').textContent = msg;
  $('situacao').classList.add('erro');
}

/** @param {string} caminho */
async function enviar(caminho) {
  try {
    const r = await fetch(caminho, { method: 'POST', headers: { 'x-tse-auditor': '1' } });
    if (!r.ok) avisar(`falha no comando (${r.status}): ${(await r.json().catch(() => ({}))).erro ?? r.statusText}`);
    return r.ok;
  } catch (err) {
    avisar(`falha no comando: ${/** @type {Error} */ (err).message}`);
    return false;
  }
}

// Comandos de coleta: botão com UF e ação (tabela de UFs) ou com data-coleta. Os chips de escopo da análise também
// têm data-uf, mas sem ação: não são comando.
document.addEventListener('click', async (ev) => {
  const botao = /** @type {Element} */ (ev.target).closest('button');
  if (!botao) return;
  const caminho = botao.dataset.uf && botao.dataset.acao ? `/api/uf/${botao.dataset.uf}/${botao.dataset.acao}`
    : botao.dataset.coleta && `/api/coleta/${botao.dataset.coleta}`;
  if (!caminho) return;
  botao.disabled = true;
  if (!(await enviar(caminho))) botao.disabled = false;
});

// ---- abas (#coleta, #analise, #publicacao, #configuracao) ----

const ABAS = SITE ? ['analise'] : ['coleta', 'analise', 'publicacao', 'configuracao'];
if (SITE) {
  for (const a of document.querySelectorAll('[data-aba]')) if (/** @type {HTMLElement} */ (a).dataset.aba !== 'analise') a.remove();
  for (const s of document.querySelectorAll('section.aba')) if (s.id !== 'aba-analise') /** @type {HTMLElement} */ (s).hidden = true;
}
/** @param {string} aba */
function trocarAba(aba) {
  if (!ABAS.includes(aba)) aba = ABAS[0] ?? 'coleta';
  for (const a of ABAS) {
    $(`aba-${a}`).hidden = a !== aba;
    document.querySelector(`[data-aba="${a}"]`)?.classList.toggle('ativa', a === aba);
  }
  if (location.hash !== `#${aba}`) history.replaceState(null, '', `#${aba}`);
  try { localStorage.setItem('aba', aba); } catch { /* sem armazenamento */ }
}
window.addEventListener('hashchange', () => trocarAba(location.hash.slice(1)));
{
  let guardada = '';
  try { guardada = localStorage.getItem('aba') ?? ''; } catch { /* sem armazenamento */ }
  trocarAba(location.hash.slice(1) || guardada);
}

// ---- configuração ----

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag
 * @param {Record<string, unknown>} [props]
 * @param {...(Node | string)} filhos
 * @returns {HTMLElementTagNameMap[T]}
 */
const el = (tag, props = {}, ...filhos) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...filhos);
  return n;
};

// Opções avançadas, agrupadas. `campo` usa o mesmo caminho de `limites` (ex.: http.tentativas).
/** @type {[titulo: string, campos: { campo: string, rotulo: string, dica: string, tipo?: string }[]][]} */
const AVANCADO = [
  ['Conexões com o TSE', [
    { campo: 'http.tentativas', rotulo: 'Tentativas por requisição', dica: 'quantas vezes repetir uma requisição que falhou (429, 5xx ou rede) antes de desistir' },
    { campo: 'http.esperaBaseMs', rotulo: 'Espera inicial (ms)', dica: 'espera antes de repetir; dobra a cada nova tentativa, com variação aleatória' },
    { campo: 'http.esperaMaxMs', rotulo: 'Espera máxima (ms)', dica: 'teto da espera entre tentativas; não pode ser menor que a inicial' },
    { campo: 'http.timeoutMs', rotulo: 'Tempo limite (ms)', dica: 'tempo máximo de uma requisição antes de contar como falha' },
    { campo: 'http.userAgent', rotulo: 'User-Agent', tipo: 'text', dica: 'identificação enviada ao TSE (só ASCII)' },
  ]],
  ['Verificação', [
    { campo: 'tentativasVerificacao', rotulo: 'Tentativas de verificação', dica: 'quantas vezes baixar um arquivo cujo hash não confere antes de marcar erro' },
  ]],
  ['Proteções', [
    { campo: 'limiteFalhasRede', rotulo: 'Falhas de rede seguidas', dica: 'quantas falhas sem resposta do TSE, em sequência, interrompem a coleta' },
    { campo: 'minLivreGB', rotulo: 'Espaço mínimo livre (GB)', dica: 'a coleta para quando o HD fica com menos que isso livre' },
  ]],
  ['Desempenho', [
    { campo: 'intervaloCommitMs', rotulo: 'Gravação do manifest (ms)', dica: 'de quanto em quanto tempo o progresso é gravado no disco; menor perde menos se cair, mas escreve mais' },
    { campo: 'intervaloPainelMs', rotulo: 'Atualização do painel (ms)', dica: 'ritmo em que esta página recebe o estado da coleta' },
  ]],
  ['Análise', [
    { campo: 'analisarAoConcluir', rotulo: 'Extrair e analisar ao concluir', tipo: 'checkbox', dica: 'quando a coleta de uma UF termina, roda extrair + analisar para ela' },
  ]],
];

/** @type {Config | null} */
let cfg = null; // última resposta de GET /api/config

/** @param {any} objeto @param {string} campo @returns {any} */
const obter = (objeto, campo) => campo.split('.').reduce((o, k) => o?.[k], objeto);

/** @param {string} texto */
const curto = (texto, max = 40) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

// Uma linha por pleito: "6257 1º turno · Presidente | ..." (consultas populares longas são encurtadas;
// o texto completo fica no title).
/** @param {Pleito} p */
function descreverEleicoes(p) {
  return p.eleicoes.map((e) => `${e.cd} ${e.turno}º turno${e.cargos.length ? ` · ${e.cargos.map((c) => curto(c)).join(', ')}` : ''}`).join(' | ');
}

/** @param {string} name @param {string} value @param {boolean} marcada */
function caixa(name, value, marcada) {
  return el('input', { type: 'checkbox', name, value, checked: marcada });
}

/** @param {{ campo: string, rotulo: string, dica: string, tipo?: string }} opcao */
function campoAvancado({ campo, rotulo, dica, tipo = 'number' }) {
  const lim = /** @type {Config} */ (cfg).limites[campo] ?? /** @type {Limite} */ ({});
  const entrada = el('input', { type: tipo, id: `cfg-${campo}`, required: tipo !== 'checkbox' });
  entrada.dataset.campo = campo;
  if (tipo === 'number') Object.assign(entrada, { min: lim.min, max: lim.max, step: 1 });
  if (lim.maxLength) entrada.maxLength = lim.maxLength;
  let padrao = obter(/** @type {Config} */ (cfg).padroes, campo);
  if (typeof padrao === 'boolean') padrao = padrao ? 'ligado' : 'desligado';
  const faixa = tipo === 'number' ? `; de ${num(lim.min)} a ${num(lim.max)}` : '';
  return el('label', { className: 'campo' },
    el('span', { textContent: rotulo }),
    entrada,
    el('span', { className: 'dica', textContent: `${dica} (padrão ${typeof padrao === 'number' ? num(padrao) : padrao}${faixa})` }));
}

/** @param {Opcoes} origem */
function preencherOpcoes(origem) {
  $('cfg-concorrencia').value = origem.concorrencia;
  $('cfg-hd').value = origem.hd ?? '';
  atualizarPasta();
  for (const entrada of /** @type {NodeListOf<HTMLInputElement>} */ ($('cfg-avancado').querySelectorAll('[data-campo]'))) {
    if (entrada.type === 'checkbox') entrada.checked = obter(origem, /** @type {string} */ (entrada.dataset.campo)) !== false;
    else entrada.value = obter(origem, /** @type {string} */ (entrada.dataset.campo));
  }
  avisarConcorrencia();
}

function renderConfig() {
  const { atual, disponiveis, padroes, limites, somenteLeitura } = /** @type {Config} */ (cfg);
  const escolhidos = new Set(atual?.pleitos ?? []);
  /** @type {Map<string, Pleito[]>} */
  const ciclos = new Map();
  for (const p of disponiveis.pleitos) {
    if (!ciclos.has(p.ciclo)) ciclos.set(p.ciclo, []);
    /** @type {Pleito[]} */ (ciclos.get(p.ciclo)).push(p);
  }
  $('cfg-pleitos').replaceChildren(...[...ciclos].map(([ciclo, pleitos], i) =>
    el('details', { className: 'ciclo', open: atual ? atual.ciclo === ciclo : i === 0 },
      el('summary', { textContent: `${ciclo} (${pleitos.length} pleito${pleitos.length > 1 ? 's' : ''})` }),
      ...pleitos.map((p) => el('label', { title: p.eleicoes.map((e) => `${e.cd} ${e.nome}${e.cargos.length ? `: ${e.cargos.join(', ')}` : ''}`).join('\n') },
        caixa('pleito', p.cd, escolhidos.has(p.cd)),
        el('b', { textContent: ` ${p.cd}` }),
        el('span', { className: 'data', textContent: p.data }),
        el('span', { className: 'dica', textContent: descreverEleicoes(p) }))))));

  const ufs = new Set(atual?.ufs ?? []);
  $('cfg-ufs').replaceChildren(...disponiveis.ufs.map((uf) =>
    el('label', {}, caixa('uf', uf, ufs.has(uf)), ` ${uf.toUpperCase()}`)));

  Object.assign($('cfg-concorrencia'), { min: limites.concorrencia.min, max: limites.concorrencia.max });
  $('cfg-concorrencia-dica').textContent = `conexões simultâneas ao TSE (padrão ${padroes.concorrencia}; de ${limites.concorrencia.min} a ${limites.concorrencia.max})`;

  $('cfg-avancado').replaceChildren(...AVANCADO.map(([titulo, campos]) =>
    el('fieldset', {}, el('legend', { textContent: titulo }), ...campos.map(campoAvancado))));
  /** @type {HTMLElement} */ ($('cfg-avancado').lastChild).append(
    el('dl', { className: 'leitura' },
      el('dt', { textContent: 'Fonte (oficial do TSE)' }), el('dd', {}, el('code', { textContent: `${somenteLeitura.base}/${somenteLeitura.ambiente}` })),
      el('dt', { textContent: 'Porta do painel' }), el('dd', { textContent: `${somenteLeitura.porta} — mudar a porta exige reiniciar: node src/cli.ts painel --porta N` })));
  preencherOpcoes(atual ?? padroes);

  $('cfg-dados').textContent = atual?.dados ?? (somenteLeitura.dadosFixo || '— (definida ao aplicar: <HD>/tse<ano>)');
  $('cfg-resumo').textContent = atual
    ? `pleitos ${atual.pleitos.join(', ')} · ${atual.ufs.length === disponiveis.ufs.length ? 'todas as UFs' : atual.ufs.map((u) => u.toUpperCase()).join(', ')} · concorrência ${atual.concorrencia}`
    : 'nenhuma';
}

function avisarConcorrencia() {
  const alerta = cfg?.limites.concorrencia.alerta ?? 16;
  $('cfg-concorrencia-alerta').hidden = !(Number($('cfg-concorrencia').value) > alerta);
}

async function carregarConfig() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    cfg = await r.json();
    renderConfig();
  } catch (err) {
    mensagemConfig(`não foi possível ler a configuração: ${/** @type {Error} */ (err).message}`, 'erro');
  }
}

/** @param {string} texto */
function mensagemConfig(texto, classe = '') {
  $('cfg-msg').textContent = texto;
  $('cfg-msg').className = classe;
}

/** @param {string} name @returns {string[]} */
const marcados = (name) => [.../** @type {NodeListOf<HTMLInputElement>} */ ($('form-config').querySelectorAll(`input[name="${name}"]:checked`))].map((i) => i.value);

/** @returns {FormConfig} */
function lerFormulario() {
  /** @type {FormConfig} */
  const config = { pleitos: marcados('pleito'), ufs: marcados('uf'), concorrencia: Number($('cfg-concorrencia').value), hd: $('cfg-hd').value.trim(), http: {} };
  for (const entrada of /** @type {NodeListOf<HTMLInputElement>} */ ($('cfg-avancado').querySelectorAll('[data-campo]'))) {
    const valor = entrada.type === 'checkbox' ? entrada.checked : entrada.type === 'number' ? Number(entrada.value) : entrada.value;
    const partes = /** @type {string} */ (entrada.dataset.campo).split('.');
    if (partes.length === 2) config[partes[0]][partes[1]] = valor;
    else config[partes[0]] = valor;
  }
  return config;
}

// Mesmas regras do servidor, para avisar antes de enviar.
/** @param {FormConfig} config */
function problemaNaConfig(config) {
  if (config.pleitos.length === 0) return 'escolha ao menos um pleito';
  const ciclos = new Set(config.pleitos.map((cd) => cfg?.disponiveis.pleitos.find((p) => p.cd === cd)?.ciclo));
  if (ciclos.size > 1) return `os pleitos precisam ser do mesmo ciclo: ${[...ciclos].join(', ')}`;
  if (config.ufs.length === 0) return 'escolha ao menos uma UF';
  for (const [campo, lim] of Object.entries(cfg?.limites ?? {})) {
    if (lim.min === undefined) continue;
    const valor = obter(config, campo);
    if (!Number.isInteger(valor) || valor < lim.min || valor > lim.max) {
      const rotulo = campo === 'concorrencia' ? 'Concorrência' : $(`cfg-${campo}`)?.previousSibling?.textContent ?? campo;
      return `${rotulo}: use um inteiro de ${num(lim.min)} a ${num(lim.max)}`;
    }
  }
  if (config.http.esperaMaxMs < config.http.esperaBaseMs) return 'a espera máxima não pode ser menor que a inicial';
  const ua = config.http.userAgent.trim();
  if (!ua || ua.length > 200 || !/^[\x20-\x7e]+$/.test(ua)) return 'o User-Agent precisa ter de 1 a 200 caracteres ASCII visíveis (sem acentos)';
  if (!ABSOLUTO.test(config.hd.trim())) return 'a pasta onde salvar precisa ser um caminho completo (ex.: /media/usuario/HD ou D:\\Dados)';
  return null;
}

$('cfg-concorrencia').addEventListener('input', avisarConcorrencia);

// ---- pasta onde salvar ----
const ABSOLUTO = /^(\/|[A-Za-z]:[\\/]|\\\\)/;
/** @typedef {{ caminho: string, pai: string | null, pastas: string[], truncado: boolean, livreBytes: number | null, gravavel: boolean,
 *   atalhos: { rotulo: string, caminho: string }[] }} ListaPastas */
const separador = (/** @type {string} */ c) => (/^[A-Za-z]:|\\/.test(c) && !c.startsWith('/') ? '\\' : '/');
const juntar = (/** @type {string} */ a, /** @type {string} */ b) => (a.endsWith('/') || a.endsWith('\\') ? a + b : a + separador(a) + b);
const semBarraFinal = (/** @type {string} */ c) => (c.length > 1 && !/^[A-Za-z]:[\\/]$/.test(c) ? c.replace(/[\\/]+$/, '') : c);
// Ano do ciclo dos pleitos marcados (ele2026 → 2026), para mostrar o destino <pasta>/tse<ano>.
function anoMarcado() {
  const cd = marcados('pleito')[0] ?? cfg?.atual?.pleitos[0];
  const ciclo = cfg?.disponiveis.pleitos.find((p) => p.cd === cd)?.ciclo ?? cfg?.atual?.ciclo ?? '';
  return /^ele(\d{4})$/.exec(ciclo)?.[1] ?? '<ano>';
}
let consultaPasta = 0;
// Destino, espaço livre e aviso de troca de pasta, a cada mudança do campo (consulta ao servidor com atraso curto).
function atualizarPasta() {
  if (!cfg) return;
  const fixo = cfg.somenteLeitura.dadosFixo;
  $('cfg-hd').disabled = $('cfg-hd-escolher').disabled = !!fixo;
  const hd = $('cfg-hd').value.trim();
  const alerta = $('cfg-hd-alerta');
  if (fixo) {
    $('cfg-hd-dica').textContent = `A pasta de dados foi fixada ao abrir o painel (--dados ${fixo}); este campo não é usado.`;
    alerta.hidden = true;
    return;
  }
  const atual = cfg.atual?.hd;
  const mudou = !!atual && semBarraFinal(hd) !== semBarraFinal(atual);
  alerta.hidden = !mudou;
  alerta.textContent = mudou
    ? `Trocar a pasta não move o que já foi baixado (em ${cfg.atual?.dados ?? atual}). Na nova pasta, a coleta recomeça do zero, e os arquivos antigos continuam onde estão. Para levar tudo junto, feche o painel, mova a pasta tse${anoMarcado()} inteira para o novo lugar e depois aplique.`
    : '';
  if (!ABSOLUTO.test(hd)) {
    $('cfg-hd-dica').textContent = 'Informe um caminho completo, por exemplo /media/usuario/HD (Linux) ou D:\\Dados (Windows), ou clique em Escolher…';
    return;
  }
  const destino = juntar(semBarraFinal(hd), `tse${anoMarcado()}`);
  $('cfg-hd-dica').textContent = `Os arquivos ficam em ${destino}; nada é gravado fora dela.`;
  const n = ++consultaPasta;
  setTimeout(async () => {
    if (n !== consultaPasta) return;
    try {
      const l = /** @type {ListaPastas} */ (await obterJson(`/api/pastas?caminho=${encodeURIComponent(hd)}`));
      if (n !== consultaPasta) return;
      const extra = [l.livreBytes != null ? `livre: ${fmtBytes(l.livreBytes)}` : '', l.gravavel ? '' : 'sem permissão de escrita nesta pasta'].filter(Boolean).join(' · ');
      $('cfg-hd-dica').textContent = `Os arquivos ficam em ${destino}; nada é gravado fora dela.${extra ? ` (${extra})` : ''}`;
    } catch (err) {
      if (n !== consultaPasta) return;
      $('cfg-hd-dica').textContent = `${/** @type {Error} */ (err).message}. O HD está conectado? A pasta precisa existir ao aplicar.`;
    }
  }, 300);
}
$('cfg-hd').addEventListener('input', atualizarPasta);
$('cfg-pleitos').addEventListener('change', atualizarPasta);

/** @type {ListaPastas | null} */
let pastaAberta = null;
/** @param {string | null} [caminho] */
async function navegarPasta(caminho) {
  $('pasta-msg').textContent = '';
  try {
    const l = /** @type {ListaPastas} */ (await obterJson(`/api/pastas${caminho ? `?caminho=${encodeURIComponent(caminho)}` : ''}`));
    mostrarPasta(l);
  } catch (err) {
    $('pasta-msg').textContent = /** @type {Error} */ (err).message;
    if (!pastaAberta && caminho) await navegarPasta(null); // caminho do campo não existe: abre na pasta pessoal
  }
}
/** @param {ListaPastas} l */
function mostrarPasta(l) {
  pastaAberta = l;
  $('pasta-caminho').textContent = l.caminho;
  $('pasta-subir').disabled = !l.pai;
  $('pasta-info').textContent = [l.livreBytes != null ? `livre: ${fmtBytes(l.livreBytes)}` : '', l.gravavel ? '' : 'sem permissão de escrita aqui',
    l.truncado ? 'mostrando as primeiras 500 pastas' : ''].filter(Boolean).join(' · ');
  $('pasta-atalhos').replaceChildren(...l.atalhos.map((a) => {
    const b = el('button', { type: 'button', className: 'chip', textContent: a.rotulo, title: a.caminho });
    b.setAttribute('aria-pressed', String(a.caminho === l.caminho));
    b.addEventListener('click', () => navegarPasta(a.caminho));
    return b;
  }));
  $('pasta-lista').replaceChildren(...(l.pastas.length
    ? l.pastas.map((nome) => {
      const b = el('button', { type: 'button', textContent: `📁 ${nome}` });
      b.addEventListener('click', () => navegarPasta(juntar(l.caminho, nome)));
      return el('li', {}, b);
    })
    : [el('li', { className: 'vazia', textContent: 'nenhuma subpasta' })]));
  /** @type {HTMLButtonElement} */ ($('pasta-usar')).disabled = !l.gravavel;
}
$('cfg-hd-escolher').addEventListener('click', () => {
  pastaAberta = null;
  $('pasta-nova').value = '';
  $('pasta-modal').showModal();
  const hd = $('cfg-hd').value.trim();
  navegarPasta(ABSOLUTO.test(hd) ? hd : null);
});
$('pasta-subir').addEventListener('click', () => { if (pastaAberta?.pai) navegarPasta(pastaAberta.pai); });
$('pasta-criar').addEventListener('click', async () => {
  if (!pastaAberta) return;
  const nome = $('pasta-nova').value.trim();
  if (!nome) return void ($('pasta-msg').textContent = 'digite o nome da nova pasta');
  try {
    mostrarPasta(/** @type {ListaPastas} */ (await obterJson('/api/pastas', {
      method: 'POST', headers: { 'x-tse-auditor': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ caminho: pastaAberta.caminho, nome }),
    })));
    $('pasta-nova').value = '';
    $('pasta-msg').textContent = 'pasta criada';
  } catch (err) {
    $('pasta-msg').textContent = /** @type {Error} */ (err).message;
  }
});
$('pasta-usar').addEventListener('click', () => {
  if (!pastaAberta) return;
  $('cfg-hd').value = pastaAberta.caminho;
  $('pasta-modal').close();
  atualizarPasta();
  mensagemConfig('pasta escolhida; clique em Aplicar para valer');
});
for (const id of ['pasta-fechar', 'pasta-cancelar']) $(id).addEventListener('click', () => $('pasta-modal').close());
$('ufs-todas').addEventListener('click', () => {
  for (const i of $('cfg-ufs').querySelectorAll('input')) i.checked = true;
});
$('ufs-limpar').addEventListener('click', () => {
  for (const i of $('cfg-ufs').querySelectorAll('input')) i.checked = false;
});
$('cfg-padroes').addEventListener('click', () => {
  if (!cfg) return;
  preencherOpcoes(cfg.padroes);
  mensagemConfig('padrões preenchidos (pleitos e UFs mantidos); aplique para valer');
});

$('form-config').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const iniciar = /** @type {HTMLButtonElement | null} */ (ev.submitter)?.value === 'iniciar';
  const config = lerFormulario();
  const problema = problemaNaConfig(config);
  if (problema) return mensagemConfig(problema, 'erro');
  if (ultimoEstado?.coleta.rodando
    && !confirm('A coleta atual será parada e reiniciada com a nova configuração; o que já foi baixado é mantido. Continuar?')) return;
  const botoes = /** @type {NodeListOf<HTMLButtonElement>} */ ($('form-config').querySelectorAll('button[type=submit]'));
  for (const b of botoes) b.disabled = true;
  mensagemConfig('aplicando… (se a coleta estiver rodando, espera as seções em andamento)');
  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'x-tse-auditor': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ ...config, iniciar }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      mensagemConfig(`não aplicada: ${corpo.erro ?? r.statusText}`, 'erro');
      return;
    }
    await carregarConfig();
    mensagemConfig(iniciar ? 'configuração aplicada; coleta iniciada' : 'configuração aplicada', 'ok');
  } catch (err) {
    mensagemConfig(`não aplicada: ${/** @type {Error} */ (err).message}`, 'erro');
  } finally {
    for (const b of botoes) b.disabled = false;
  }
});

if (SITE) {
  window.tseSite?.then((s) => { $('situacao').textContent = `dados publicados em ${new Date(s.geradoEm).toLocaleString('pt-BR')}`; },
    (err) => avisar(`não foi possível abrir os dados: ${err.message}`));
} else {
  carregarConfig();
  const fonte = new EventSource('/api/eventos');
  fonte.onmessage = (m) => render(JSON.parse(m.data));
  fonte.addEventListener('falha', (m) => avisar(`falha ao ler o estado: ${JSON.parse(/** @type {MessageEvent} */ (m).data)}`));
  fonte.onerror = () => avisar('sem conexão com o painel; tentando de novo…');
}

// ---- análise: seções destoantes (sinais + explicações candidatas; nunca veredito) ----

const CORES = { biometria: '#2f81f7', mesario: '#d29922', anoNascimento: '#8957e5' };
const ROTULO_HAB = { biometria: 'biometria', mesario: 'mesário', anoNascimento: 'ano de nascimento' };
/** @type {{ ufs: AnaliseUf[], jobs: { jobs: Job[] }, uf: string | null, rankingDe: string | null }} */
const an = { ufs: [], jobs: { jobs: [] }, uf: null, rankingDe: null };

/** @param {string} caminho @param {RequestInit} [opcoes] @returns {Promise<any>} JSON da API, tipado por quem chama */
async function obterJson(caminho, opcoes) {
  if (SITE && caminho.startsWith('/api/')) {
    if (!window.tseSite) throw new Error('dados indisponíveis');
    const { status, corpo } = await (await window.tseSite).api(caminho);
    if (status >= 400) throw new Error(/** @type {any} */ (corpo)?.erro ?? `HTTP ${status}`);
    return corpo;
  }
  const r = await fetch(caminho, opcoes);
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.erro ?? `HTTP ${r.status}`);
  return corpo;
}

/** @param {string | null | undefined} texto */
const td = (texto) => el('td', { textContent: texto ?? '—' });

// Glossário dos códigos de sinais (por grupo de cor) e das explicações candidatas.
/** @type {Record<string, [grupo: string, rotulo: string, descricao: string]>} */
const SINAIS = {
  MESARIO_ACIMA_LOCAL: ['mesario', 'Mesário acima do local', 'Proporção de eleitores liberados pelo mesário bem acima das outras seções do mesmo local de votação.'],
  MESARIO_ACIMA_ZONA: ['mesario', 'Mesário acima da zona', 'Proporção de liberação pelo mesário bem acima das seções da mesma zona.'],
  MESARIO_SUBIU_OUTRO_TURNO: ['mesario', 'Mesário subiu entre turnos', 'A liberação pelo mesário aumentou muito em relação ao outro turno na mesma seção.'],
  MESARIO_ULTIMA_HORA: ['mesario', 'Mesário na última hora', 'Liberações pelo mesário concentradas na última hora de votação.'],
  ABSTENCAO_CAIU_MESARIO_SUBIU: ['mesario', 'Abstenção caiu e mesário subiu', 'Entre turnos, a abstenção caiu ao mesmo tempo em que a liberação pelo mesário subiu.'],
  VARIACAO_ATIPICA_ZONA: ['turnos', 'Variação atípica entre turnos', 'Votos de um candidato a presidente mudaram entre os turnos muito mais do que nas seções da zona.'],
  GANHO_ACIMA_DISPONIVEL: ['turnos', 'Ganho acima do disponível', 'Um candidato ganhou mais votos no 2º turno do que havia votos disponíveis na seção.'],
  VOTO_APOS_PAUSA_17H: ['horarios', 'Voto após pausa no encerramento', 'Voto registrado depois do encerramento após 30 min ou mais sem votos (não parece fila).'],
  VOTO_ANTES_ABERTURA: ['horarios', 'Voto antes da abertura', 'Voto computado antes do horário de abertura da votação.'],
  TESTE_CARGA_NO_DIA: ['horarios', 'Teste/carga no dia', 'Eventos de teste ou carga da urna misturados à votação no dia da eleição.'],
  COMPARECIMENTO_ACIMA_APTOS: ['limites', 'Comparecimento acima de aptos', 'Mais eleitores votaram do que o número de aptos da seção.'],
  VOTOS_ACIMA_COMPARECIMENTO: ['limites', 'Votos acima do comparecimento', 'Total de votos de um cargo maior que o comparecimento.'],
};
/** @type {Record<string, [rotulo: string, descricao: string]>} */
const EXPLICACOES = {
  fila_17h: ['Fila no encerramento', 'Votos contínuos até o encerramento, indicando fila real.'],
  leitor_biometrico_defeito: ['Leitor biométrico com defeito', 'Muitas tentativas de digital falhando desde cedo; o mesário precisa liberar mais.'],
  eleitores_sem_biometria: ['Eleitores sem biometria', 'Muitos eleitores habilitados pelo ano de nascimento (sem biometria cadastrada).'],
  secao_agregada: ['Seção agregada', 'A seção recebeu eleitores de outra seção, o que muda o perfil entre turnos.'],
  contingencia: ['Urna de reserva', 'A urna foi substituída no dia (contingência).'],
  desvio_relogio: ['Desvio no relógio', 'O relógio da urna parece adiantado ou atrasado.'],
};
const GRUPOS = { mesario: 'Liberação pelo mesário', turnos: '1º × 2º turno', horarios: 'Horários', limites: 'Limites' };
/** @param {string} c */
const badgeSinal = (c) => el('span', { className: `badge g-${SINAIS[c]?.[0] ?? 'outro'}`, textContent: SINAIS[c]?.[1] ?? c, title: SINAIS[c]?.[2] ?? c });
/** @param {string} c */
const badgeExp = (c) => el('span', { className: 'badge explicacao', textContent: EXPLICACOES[c]?.[0] ?? c, title: EXPLICACOES[c]?.[1] ?? c });
/** @param {unknown} v @returns {string[]} */
const listaExp = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[,;]\s*/)).filter(Boolean);
/** @param {string[]} codigos @param {(c: string) => Node} f */
const tdBadges = (codigos, f) => el('td', {}, ...(codigos.length ? codigos.map(f) : [document.createTextNode('—')]));
/** No máximo 2 badges; o resto vira "+n" com os nomes no tooltip. Vazio: "Nenhuma" (vermelho suave) ou "—".
 * @param {string[]} codigos @param {(c: string) => Node} f @param {(c: string) => string} nome @param {boolean} [avisaVazio] */
function tdLimitado(codigos, f, nome, avisaVazio = false) {
  if (!codigos.length) return el('td', {}, el('span', { className: avisaVazio ? 'nenhuma' : 'dica', textContent: avisaVazio ? 'Nenhuma' : '—' }));
  const resto = codigos.slice(2);
  return el('td', { className: 'badges' }, ...codigos.slice(0, 2).map(f),
    ...(resto.length ? [el('span', { className: 'mais', textContent: `+${resto.length}`, title: resto.map(nome).join('\n') })] : []));
}

function desenharGlossario() {
  /** @param {Node} badge @param {string} texto */
  const linha = (badge, texto) => el('li', {}, badge, document.createTextNode(` ${texto}`));
  $('an-glossario').replaceChildren(
    el('h3', { textContent: 'Glossário: sinais e explicações candidatas' }),
    el('p', { className: 'dica', textContent: 'Pontuação máx.: 0–100, quanto a seção foge do padrão das vizinhas/zona/outro turno (10 × distância estatística robusta, limitado a 100; até ~30 é variação comum, acima de ~50 é bem fora do normal). Números pequenos (poucos eleitores) pedem cautela. Explicações candidatas são causas técnicas normais detectadas nos dados que podem explicar o sinal.' }),
    ...Object.entries(GRUPOS).map(([g, nome]) => el('div', {}, el('h4', { textContent: nome }),
      el('ul', {}, ...Object.entries(SINAIS).filter(([, v]) => v[0] === g).map(([c, v]) => linha(badgeSinal(c), v[2]))))),
    el('h4', { textContent: 'Explicações candidatas' }),
    el('ul', {}, ...Object.entries(EXPLICACOES).map(([c, v]) => linha(badgeExp(c), v[1]))));
}


// Estado de cada UF na aba Ranking, do ponto de vista de quem quer o resultado: cor, selo e barra de progresso.
// Ordem de prioridade: job ativo (processando / na fila) > erro do último job > analisada > pronta > baixando > aguardando.
const ESTADOS_UF = {
  processando: { rotulo: 'Processando', plural: 'processando', classe: 'est-processando' },
  fila: { rotulo: 'Na fila', plural: 'na fila', classe: 'est-fila' },
  erro: { rotulo: 'Erro na análise', plural: 'com erro na análise', classe: 'est-erro' },
  analisada: { rotulo: 'Analisada', plural: 'analisadas', classe: 'est-analisada' },
  pronta: { rotulo: 'Pronta para analisar', plural: 'prontas para analisar', classe: 'est-pronta' },
  baixando: { rotulo: 'Baixando', plural: 'baixando', classe: 'est-baixando' },
  pausada: { rotulo: 'Coleta pausada', plural: 'com coleta pausada', classe: 'est-aguardando' },
  aguardando: { rotulo: 'Aguardando coleta', plural: 'aguardando coleta', classe: 'est-aguardando' },
};
/** @typedef {keyof typeof ESTADOS_UF} EstadoUfAnalise */

/** @param {number} p fração 0–1 @param {string} texto */
const barraProgresso = (p, texto) => el('div', { className: 'progresso-uf', title: texto },
  el('div', { className: 'trilho' }, el('div', { className: 'preenchido', style: `width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%` })),
  el('span', { textContent: texto }));

function renderAnaliseUfs() {
  const coleta = new Map((ultimoEstado?.ufs ?? []).map((u) => [u.uf, u]));
  const dados = new Map(an.ufs.map((u) => [u.uf, u]));
  const todas = [...new Set([...coleta.keys(), ...dados.keys()])].sort();
  const ativo = new Set(an.jobs.jobs.filter((j) => j.estado === 'na fila' || j.estado === 'rodando').map((j) => j.uf));
  const comAchados = an.ufs.filter((u) => u.achados != null).map((u) => u.uf);
  if (!comAchados.includes($('an-uf').value)) $('an-uf').value = comAchados[0] ?? '';
  /** @type {Record<string, number>} */
  const contagem = {};
  const cartoes = todas.map((uf) => {
    const d = dados.get(uf);
    const c = coleta.get(uf);
    const st = c?.status;
    const pronta = st === 'baixado' || st === 'baixado_com_erros';
    const job = an.jobs.jobs.filter((j) => j.uf === uf).at(-1);
    const analisada = d?.achados != null;
    const coletaPct = c && c.total ? (c.concluidas + c.erros) / c.total : 0;
    /** @type {EstadoUfAnalise} */
    const estado = job?.estado === 'rodando' ? 'processando' : job?.estado === 'na fila' ? 'fila' : job?.estado === 'erro' ? 'erro'
      : analisada ? 'analisada' : pronta ? 'pronta' : st === 'baixando' || st === 'pausando' ? 'baixando' : st === 'pausada' ? 'pausada' : 'aguardando';
    contagem[estado] = (contagem[estado] ?? 0) + 1;
    const botao = ativo.has(uf)
      ? el('button', { type: 'button', className: 'pequeno', textContent: 'Cancelar',
        title: 'interrompe a extração/análise desta UF; o resultado anterior continua valendo' })
      : el('button', { type: 'button', className: 'pequeno', textContent: analisada ? 'Reanalisar' : 'Extrair e analisar',
        disabled: !pronta, title: pronta ? 'roda extrair e depois analisar para a UF' : 'disponível quando a coleta da UF termina' });
    if (ativo.has(uf)) botao.dataset.cancelar = uf;
    else botao.dataset.analisar = uf;
    /** @type {HTMLElement[]} */
    const detalhe = [];
    if (estado === 'processando' && job) {
      if (job.etapa === 'extrair' && job.percentual != null) {
        detalhe.push(barraProgresso(job.percentual, `extraindo ${fmtPct(job.percentual, 0)}`));
        if (job.secoes) detalhe.push(el('div', { className: 'dica', textContent: `${num(job.secoes.feitas)} de ${num(job.secoes.total)} seções · faltam ${num(job.secoes.total - job.secoes.feitas)}` }));
        if (job.municipios) detalhe.push(el('div', { className: 'dica', textContent: `${num(job.municipios.feitos)} de ${num(job.municipios.total)} municípios (1º e 2º turno)` }));
      } else {
        detalhe.push(el('div', { className: 'job', textContent: job.etapa === 'analisar' ? 'analisando (cruzamentos)…' : 'iniciando…' }));
      }
      if (job.progresso) detalhe.push(el('div', { className: 'dica linha-job', textContent: job.progresso, title: job.progresso }));
    } else if ((estado === 'baixando' || estado === 'pausada' || estado === 'aguardando') && coletaPct > 0) {
      detalhe.push(barraProgresso(coletaPct, `coleta ${fmtPct(coletaPct, 0)}`));
    } else if (estado === 'erro' && job?.erro) {
      detalhe.push(el('div', { className: 'job erro', textContent: job.erro }));
    } else if (job?.estado === 'cancelado') {
      detalhe.push(el('div', { className: 'dica', textContent: 'última execução cancelada' }));
    }
    const cartao = el('div', { className: `cartao-uf ${ESTADOS_UF[estado].classe}${uf === $('an-uf').value ? ' sel' : ''}${analisada ? ' analisada' : ''}`,
      title: d?.analisadoEm ? `${num(d.ok)} ok / ${num(d.secoes)} seções extraídas; ${num(d.achados ?? 0)} achados` : '' },
      el('div', { className: 'topo-uf' }, el('strong', { textContent: uf.toUpperCase() }),
        el('span', { className: 'selo-estado', textContent: ESTADOS_UF[estado].rotulo })),
      el('div', { className: 'destoantes', textContent: d?.secoesComAchados != null ? `${num(d.secoesComAchados)} destoantes` : 'sem análise' }),
      el('div', { className: 'dica', textContent: d?.analisadoEm ? `analisada em ${new Date(d.analisadoEm).toLocaleString('pt-BR')}`
        : `coleta: ${ROTULO[/** @type {string} */ (st)] ?? st ?? '—'}` }),
      ...detalhe, ...(SITE ? [] : [botao]));
    if (analisada) cartao.dataset.escolher = uf;
    return cartao;
  });
  $('an-ufs-resumo').replaceChildren(...Object.entries(ESTADOS_UF).filter(([k]) => contagem[k]).map(([k, e]) =>
    el('span', { className: `chip-estado ${e.classe}` }, el('i'), `${num(contagem[k] ?? 0)} ${contagem[k] === 1 ? e.rotulo.toLowerCase() : e.plural}`)));
  $('an-ufs').replaceChildren(...cartoes);
  const busca = /** @type {HTMLSelectElement} */ ($('an-busca-uf'));
  const extraidas = an.ufs.map((u) => u.uf);
  if (busca.options.length !== extraidas.length) {
    const antes = busca.value || $('an-uf').value;
    busca.replaceChildren(...extraidas.map((uf) => el('option', { value: uf, textContent: uf.toUpperCase() })));
    busca.value = extraidas.includes(antes) ? antes : extraidas[0] ?? '';
  }
  const atual = $('an-uf').value;
  $('an-uf-titulo').textContent = atual ? atual.toUpperCase() : '';
  if (!comAchados.length) $('an-msg').textContent = 'nenhuma UF analisada ainda';
}

function renderJobs() { renderAnaliseUfs(); }

async function atualizarAnalise() {
  try {
    const antes = an.jobs.jobs.filter((j) => j.estado === 'concluído').length;
    an.jobs = await obterJson('/api/analise/jobs');
    const mudou = an.jobs.jobs.filter((j) => j.estado === 'concluído').length !== antes;
    if (mudou || !an.ufs.length) an.ufs = (await obterJson('/api/analise/ufs')).ufs;
    renderAnaliseUfs();
    renderJobs();
    const uf = $('an-uf').value;
    if (uf && (uf !== an.rankingDe || mudou)) await carregarRanking();
  } catch (err) {
    $('an-msg').textContent = `análise: ${/** @type {Error} */ (err).message}`;
  }
}

async function carregarRanking() {
  const uf = $('an-uf').value;
  if (!uf) return;
  const sinal = $('an-sinal').value;
  const r = /** @type {Ranking} */ (await obterJson(`/api/analise/${uf}/ranking?limite=200&sinal=${encodeURIComponent(sinal)}`));
  if (an.rankingDe !== uf) {
    $('an-sinal').replaceChildren(el('option', { value: '', textContent: 'todos' }),
      ...r.sinais.map((s) => el('option', { value: s.sinal, textContent: `${SINAIS[s.sinal]?.[1] ?? s.sinal} (${num(s.n)})` })));
  }
  an.rankingDe = uf;
  $('an-msg').textContent = `${num(r.secoes.length)} seções destoantes${r.secoes.length === 200 ? ' (primeiras 200)' : ''}; clique numa linha para ver os sinais`;
  $('an-ranking').tBodies[0].replaceChildren(...r.secoes.map((s) => {
    const tr = el('tr', {},
      el('td', {}, el('div', { className: 'secao-id', textContent: `Seção ${s.secao}` }),
        el('div', { className: 'dica', textContent: `mun ${s.mun} · zona ${s.zona}` })),
      el('td', {}, el('div', { className: 'pont' },
        el('span', { className: 'barra-pont' }, el('i', { style: `width:${Math.max(0, Math.min(100, s.pontuacao))}%` })),
        el('span', { className: 'num', textContent: String(s.pontuacao) }))),
      tdLimitado(s.sinais, badgeSinal, (c) => SINAIS[c]?.[1] ?? c),
      tdLimitado(listaExp(s.explicacoes), badgeExp, (c) => EXPLICACOES[c]?.[0] ?? c, true));
    tr.addEventListener('click', () => {
      for (const o of $('an-ranking').querySelectorAll('tr.sel')) o.classList.remove('sel');
      tr.classList.add('sel');
      abrirSecao(uf, s);
    });
    return tr;
  }));
}

const SVG = 'http://www.w3.org/2000/svg';
/** @param {string} tag @param {Record<string, string | number>} [attrs] @param {...(Node | string)} filhos */
const svg = (tag, attrs = {}, ...filhos) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  n.append(...filhos);
  return n;
};

// Barras por 10 min (horário local da urna), empilhadas por tipo de habilitação.
/** @param {LinhaDoTempo} t @param {number} [escala] */
function linhaDoTempo(t, escala) {
  const ivs = t.intervalos;
  if (!ivs.length) return el('p', { className: 'dica', textContent: 'sem votos no log do dia da eleição' });
  /** @param {string} h */
  const min = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const ini = 6 * 60;
  const fim = 18 * 60; // mesmo eixo para os dois turnos
  const maxV = escala ?? Math.max(...ivs.map((i) => i.votos), 1);
  const L = 40, A = 140, W = Math.max(400, ((fim - ini) / 10) * 8), x = (/** @type {number} */ m) => L + ((m - ini) / 10) * 8;
  const g = svg('svg', { viewBox: `0 0 ${L + W + 10} ${A + 30}`, class: 'tempo', role: 'img' });
  g.append(svg('title', {}, `votos por 10 minutos, pleito ${t.pleito}`));
  for (let h = Math.ceil(ini / 60) * 60; h <= fim; h += 60) {
    g.append(svg('line', { x1: x(h), x2: x(h), y1: 0, y2: A, stroke: 'currentColor', 'stroke-opacity': 0.15 }),
      svg('text', { x: x(h), y: A + 14, 'text-anchor': 'middle' }, `${String(h / 60).padStart(2, '0')}h`));
  }
  g.append(svg('text', { x: 2, y: 10 }, String(maxV)), svg('text', { x: 2, y: A }, '0'));
  for (const i of ivs) {
    let y = A;
    for (const k of /** @type {const} */ (['biometria', 'mesario', 'anoNascimento'])) {
      const h = (i[k] / maxV) * (A - 4);
      if (!h) continue;
      y -= h;
      g.append(svg('rect', { x: x(min(i.inicio)) + 0.5, y, width: 7, height: h, fill: CORES[k] },
        svg('title', {}, `${i.inicio}: ${i[k]} ${ROTULO_HAB[k]} (${i.votos} votos)`)));
    }
  }
  return g;
}

/** @param {number | null | undefined} v */
const pct = (v) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
/** @param {unknown} ts */
const hora = (ts) => String(ts ?? '').slice(11, 16) || '—';
/** @param {number} v @param {number} r */
const vezes = (v, r) => (r > 0 ? `cerca de ${(v / r).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes` : 'bem acima de');
/** @param {number} z */
const distancia = (z) => `distância estatística ${Math.abs(z).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`;

// Frase em linguagem comum explicando por que o achado apareceu.
/** @param {Achado} a @param {(pleito: number) => string} nomeTurno */
function frase(a, nomeTurno) {
  /** @type {Record<string, any>} */
  let d = {};
  try { d = JSON.parse(a.detalhe || '{}'); } catch { /* detalhe inválido: usa só o texto do glossário */ }
  const t = nomeTurno(a.pleito);
  switch (a.sinal) {
    case 'MESARIO_ACIMA_LOCAL':
      return `No ${t}, o mesário liberou ${d.mesario} de ${d.comparecimento} eleitores (${pct(a.valor)}). Nas ${d.secoesNoLocal} seções do mesmo local de votação, o normal foi ${pct(a.referencia)}: ${vezes(a.valor, a.referencia)} o normal (${distancia(d.zRobusto)}).`;
    case 'MESARIO_ACIMA_ZONA':
      return `No ${t}, o mesário liberou ${d.mesario} de ${d.comparecimento} eleitores (${pct(a.valor)}). Nas ${d.secoesNaZona} seções da zona, o normal foi ${pct(a.referencia)}: ${vezes(a.valor, a.referencia)} o normal (${distancia(d.zRobusto)}).`;
    case 'MESARIO_SUBIU_OUTRO_TURNO':
      return `No ${t}, o mesário liberou ${d.mesario} de ${d.comparecimento} eleitores (${pct(a.valor)}), contra ${pct(a.referencia)} no outro turno na mesma seção, um aumento bem maior que o das outras seções da zona (${distancia(d.zRobusto)}).`;
    case 'MESARIO_ULTIMA_HORA':
      return `No ${t}, ${d.mesarioUltimaHora} das ${d.mesarioDia} liberações pelo mesário aconteceram na última hora, quando só ${d.votosUltimaHora} dos ${d.votosDia} votos do dia foram registrados (${pct(d.votosUltimaHora ? d.mesarioUltimaHora / d.votosUltimaHora : null)} dos votos da última hora liberados pelo mesário, contra ${pct(d.votosDia ? d.mesarioDia / d.votosDia : null)} no dia).`;
    case 'VARIACAO_ATIPICA_ZONA':
      return `O candidato ${d.candidato} teve ${d.v1} votos no 1º turno e ${d.v2} no 2º (comparecimento: ${d.comparecimento1} → ${d.comparecimento2}). Essa mudança foi bem maior que a das outras ${d.secoesNaZona} seções da zona (${distancia(d.zRobusto)}).`;
    case 'VOTO_APOS_PAUSA_17H':
      return `No ${t}, ${d.votos} voto(s) foram registrados entre ${hora(d.retomada)} e ${hora(d.ultimoVoto)} (horário local), depois de uma pausa de 30 min ou mais após o encerramento.`;
    case 'COMPARECIMENTO_ACIMA_APTOS':
      return `No ${t}, o comparecimento (${d.comparecimento}) é maior que o número de aptos (${d.aptos}).`;
    default:
      return `No ${t}: ${SINAIS[a.sinal]?.[2] ?? a.sinal}`;
  }
}

function fecharModal() { $('an-modal').close(); }

/** Nome legível de uma chave de votos ('c13', 'branco', 'branco_nulo', 'abstencao'…). @param {string} k */
function rotuloChave(k) {
  if (/^c\d+$/.test(k)) return nomeCand(Number(k.slice(1)));
  return ({ branco: 'Brancos', nulo: 'Nulos', branco_nulo: 'Brancos e nulos', outros: 'Outros candidatos', abstencao: 'Abstenção',
    deixaram_de_votar: 'Deixaram de votar' })[k] ?? k;
}

// Saldo 1º → 2º turno da seção: de onde vieram os votos que mudaram de lugar e, para cada ganho, a faixa possível.
/** @param {Balanco} b */
function blocoBalanco(b) {
  const totalLivre = b.liberados + b.novos;
  const fontes = el('ul', { className: 'balanco-lista' },
    ...b.fontes.map((f) => el('li', {}, el('span', { textContent: rotuloChave(f.chave) }), el('b', { textContent: num(f.votos) }))),
    ...(b.novos ? [el('li', {}, el('span', { textContent: 'Eleitores a mais no 2º turno' }), el('b', { textContent: num(b.novos) }))] : []),
    el('li', { className: 'total' }, el('span', { textContent: 'Total que mudou de lugar' }), el('b', { textContent: num(totalLivre) })));
  /** @param {[number, number]} f */
  const faixa = (f) => (f[0] === f[1] ? num(f[0]) : `${num(f[0])} a ${num(f[1])}`);
  const destinos = el('table', { className: 'comparacao' },
    el('thead', {}, el('tr', {}, el('th', { textContent: 'Ganhou' }), el('th', { textContent: 'Saldo' }),
      el('th', { textContent: 'de eleitores a mais' }), el('th', { textContent: 'de votos liberados' }))),
    el('tbody', {}, ...b.ganhos.map((g) => el('tr', {}, el('th', { textContent: rotuloChave(g.chave) }),
      el('td', { className: 'sobe', textContent: `+${num(g.ganho)}` }), td(faixa(g.deNovos)), td(faixa(g.deLiberados))))));
  const maior = b.ganhos.find((g) => g.chave !== 'deixaram_de_votar');
  const frases = [];
  if (maior && maior.deNovos[0] > 0) {
    frases.push(`Mesmo que todos os ${num(b.liberados)} votos liberados tivessem ido para ${rotuloChave(maior.chave)}, ainda faltariam ${num(maior.deNovos[0])} votos, que só podem ter vindo de eleitores que não votaram no 1º turno (ou de quem trocou de lado).`);
  }
  if (!b.fecha) frases.push('Atenção: a soma das diferenças não bate com a diferença de comparecimento nesta seção; confira as inconsistências.');
  return el('div', { className: 'balanco' },
    el('div', { className: 'balanco-colunas' },
      el('div', {}, el('h5', { textContent: 'Votos que ficaram livres' }), fontes),
      el('div', {}, el('h5', { textContent: 'Para onde foram (saldo)' }), destinos)),
    ...frases.map((f) => el('p', { textContent: f })),
    el('p', { className: 'dica', textContent: 'É só o saldo líquido: eleitores podem ter trocado de lado nos dois sentidos, e o voto é secreto, então não há como saber quem votou em quem. As faixas mostram o mínimo e o máximo compatíveis com as contas. Para estimar a migração com mais seções, veja "Migração estimada" na Visão geral.' }));
}

/** @param {string} uf @param {SecaoRanking} s */
async function abrirSecao(uf, s) {
  const modal = $('an-modal');
  const corpo = $('an-modal-corpo');
  corpo.replaceChildren(el('p', { textContent: 'carregando…' }));
  if (!modal.open) modal.showModal();
  try {
    const d = /** @type {DetalheSecao} */ (await obterJson(`/api/analise/${uf}/secao/${encodeURIComponent(s.mun)}/${encodeURIComponent(s.zona)}/${encodeURIComponent(s.secao)}`));
    const turnos = [...d.turnos].sort((x, y) => x.pleito - y.pleito);
    const nomeTurno = (/** @type {number} */ p) => (turnos.findIndex((t) => t.pleito === p) === 1 ? '2º turno' : '1º turno');
    const [t1, t2] = turnos;
    const pontuacao = Math.max(...d.achados.map((a) => a.pontuacao), 0);

    // O que é destacado na tabela: candidatos e linhas citados pelos sinais.
    const destaque = new Set();
    for (const a of d.achados) {
      if (a.sinal.startsWith('MESARIO') || a.sinal.startsWith('ABSTENCAO')) destaque.add('mesario');
      try { const j = JSON.parse(a.detalhe || '{}'); if (j.candidato != null) destaque.add(`c${j.candidato}`); } catch { /* ignora */ }
    }

    // Resumo: por que a seção apareceu.
    const cartoesAchados = d.achados.map((a) => {
      const exp = listaExp(a.explicacoesCandidatas);
      return el('div', { className: 'achado' },
        el('div', {}, badgeSinal(a.sinal), el('span', { className: 'pts', textContent: `pontuação ${a.pontuacao}` })),
        el('p', { textContent: frase(a, nomeTurno) }),
        exp.length
          ? el('p', { className: 'dica' }, document.createTextNode('Possível explicação técnica: '), ...exp.map(badgeExp))
          : el('p', { className: 'sem-exp', textContent: 'Nenhuma explicação técnica encontrada automaticamente: vale verificar com prioridade.' }));
    });

    // Tabela comparativa 1º × 2º turno.
    /** @param {TurnoSecao | undefined} t @param {string} k */
    const val = (t, k) => (t ? t[k] : null);
    const c1 = val(t1, 'comparecimento'), c2 = val(t2, 'comparecimento');
    /** @param {TurnoSecao | undefined} t @param {string} chave */
    const votos = (t, chave) => {
      if (!t) return null;
      const v = d.presidente.filter((p) => p.pleito === t.pleito && (p.tipo === 'nominal' ? `c${p.numero}` : p.tipo) === chave);
      return v.length ? v.reduce((x, p) => x + p.votos, 0) : 0;
    };
    /** @param {number | null | undefined} v @param {number | null} [base] */
    const fmt = (v, base) => (v == null ? '—' : base ? `${num(v)} (${pct(v / base)})` : num(v));
    /** @param {number | null | undefined} a @param {number | null | undefined} b */
    const dif = (a, b) => {
      if (a == null || b == null) return el('td', { textContent: '—' });
      const x = b - a;
      return el('td', { className: x > 0 ? 'sobe' : x < 0 ? 'desce' : '', textContent: x === 0 ? '0' : `${x > 0 ? '+' : ''}${num(x)}` });
    };
    /** @param {string} rotulo @param {number | null} a @param {number | null} b @param {number | null} [baseA] @param {number | null} [baseB] @param {string} [chave] */
    const linha = (rotulo, a, b, baseA, baseB, chave) => el('tr', { className: destaque.has(chave) ? 'destaque' : '' },
      el('th', { textContent: rotulo }), td(fmt(a, baseA)), td(fmt(b, baseB)), dif(a, b));
    // Liberação: BU com o valor do log ao lado quando os dois discordam (ex.: biometria e mesário trocados).
    let divergeLog = false;
    /** @param {TurnoSecao | undefined} t @param {string} campo @param {string} campoLog @param {number | null} base */
    const celHab = (t, campo, campoLog, base) => {
      const v = val(t, campo), l = val(t, campoLog);
      if (!t || l == null || !t.logDia || l === v) return td(fmt(v, base));
      divergeLog = true;
      return el('td', {}, fmt(v, base), el('span', { className: 'log-diverge', title: 'valor contado no log da urna', textContent: ` · log ${num(l)}` }));
    };
    /** @param {string} rotulo @param {string} campo @param {string} campoLog @param {string} [chave] */
    const linhaHab = (rotulo, campo, campoLog, chave) => el('tr', { className: chave && destaque.has(chave) ? 'destaque' : '' },
      el('th', { textContent: rotulo }), celHab(t1, campo, campoLog, c1), celHab(t2, campo, campoLog, c2), dif(val(t1, campo), val(t2, campo)));
    /** @param {string} titulo */
    const grupo = (titulo) => el('tr', { className: 'grupo' }, el('th', { colSpan: 4, textContent: titulo }));
    const chavesPres = [...new Set(d.presidente.map((p) => (p.tipo === 'nominal' ? `c${p.numero}` : p.tipo)))]
      .sort((x, y) => (x[0] === 'c') === (y[0] === 'c') ? x.localeCompare(y, 'pt', { numeric: true }) : x[0] === 'c' ? -1 : 1);
    const tabela = el('table', { className: 'comparacao' },
      el('thead', {}, el('tr', {}, el('th'), el('th', { textContent: '1º turno' }), el('th', { textContent: '2º turno' }), el('th', { textContent: 'Diferença' }))),
      el('tbody', {},
        grupo('Eleitores'),
        linha('Aptos', val(t1, 'aptos'), val(t2, 'aptos')),
        linha('Compareceram', c1, c2, val(t1, 'aptos'), val(t2, 'aptos')),
        linha('Abstenção', val(t1, 'abstencao'), val(t2, 'abstencao'), val(t1, 'aptos'), val(t2, 'aptos')),
        grupo('Como o eleitor foi liberado (% de quem compareceu)'),
        linhaHab('Biometria', 'qtdHabilitacaoBiometrica', 'logHabBiometrica'),
        linhaHab('Pelo mesário', 'qtdHabilitacaoMesario', 'logHabMesario', 'mesario'),
        linhaHab('Ano de nascimento', 'qtdHabilitacaoAnoNascimento', 'logHabAnoNascimento'),
        grupo('Presidente (% de quem compareceu)'),
        ...chavesPres.map((k) => linha(k[0] === 'c' ? `Candidato ${k.slice(1)}` : k === 'branco' ? 'Brancos' : k === 'nulo' ? 'Nulos' : k,
          votos(t1, k), votos(t2, k), c1, c2, k))));

    // Linhas do tempo na mesma escala.
    const lts = turnos.map((t) => d.linhaDoTempo.find((x) => x.pleito === t.pleito));
    const escala = Math.max(1, ...lts.flatMap((lt) => (lt ? lt.intervalos.map((i) => i.votos) : [])));
    const legenda = el('p', { className: 'legenda' }, .../** @type {(keyof typeof CORES)[]} */ (Object.keys(CORES)).map((k) =>
      el('span', {}, Object.assign(el('i'), { style: `background:${CORES[k]}` }), ROTULO_HAB[k])));
    const tempos = el('div', { className: 'tempos' }, ...turnos.map((t, i) => el('div', {},
      el('h5', { textContent: `${nomeTurno(t.pleito)}${lts[i] ? `: ${lts[i].votos} votos, de ${lts[i].primeiroVoto.slice(0, 5)} a ${lts[i].ultimoVoto.slice(0, 5)}` : ''}` }),
      lts[i] ? linhaDoTempo(lts[i], escala)
        : el('p', { className: 'dica', textContent: SITE ? 'linha do tempo só no painel local: o log das urnas fica no Release' : 'sem log' }))));

    // Dados técnicos, recolhidos.
    const tecnico = el('details', {}, el('summary', { textContent: 'Dados técnicos' }),
      el('table', {}, el('thead', {}, el('tr', {}, el('th'), ...turnos.map((t) => el('th', { textContent: `${nomeTurno(t.pleito)} (pleito ${t.pleito})` })))),
        el('tbody', {}, ...[['Situação da extração', 'status'], ['Local de votação', 'local'], ['Tipo de urna', 'tipoUrna'], ['Abertura', 'abertura'],
          ['Encerramento', 'encerramento'], ['1º voto (log)', 'logPrimeiroVoto'], ['Último voto (log)', 'logUltimoVoto'],
          ['Inconsistências', 'inconsistencias'], ['Seções agregadas', 'secoesAgregadas'], ['Agregada em', 'agregadaEm']]
          .map(([r, k]) => el('tr', {}, el('th', { textContent: r }), ...turnos.map((t) => td(t[k] == null || t[k] === '' ? '—' : String(t[k]))))))),
      el('p', { className: 'dica', textContent: `Horários da urna em horário local (+${d.horasParaBrasilia} h = Brasília).` }),
      ...d.achados.map((a) => el('pre', { textContent: `${a.sinal} (${nomeTurno(a.pleito)}): ${a.detalhe ?? ''}` })));

    corpo.replaceChildren(
      el('header', { className: 'modal-topo' },
        el('h3', { textContent: `${uf.toUpperCase()} · Município ${d.mun} · Zona ${d.zona} · Seção ${d.secao}` }),
        el('span', { className: 'pts grande', textContent: `pontuação máx. ${pontuacao}` })),
      ...(d.achados.length
        ? [el('h4', { textContent: 'Por que esta seção apareceu' }), ...cartoesAchados,
          el('p', { className: 'dica', textContent: 'Seção destoante não é prova de nada: confira as explicações antes de qualquer conclusão.' })]
        : [el('p', { className: 'dica', textContent: 'Nenhum sinal destoante nesta seção: os números abaixo ficaram dentro do padrão das seções vizinhas, da zona e do outro turno.' })]),
      el('h4', { textContent: 'Comparação entre os turnos' }), tabela,
      ...(divergeLog ? [el('p', { className: 'aviso-diverge', textContent: 'O BU e o log da urna discordam sobre como os eleitores foram liberados nesta seção (valor do log ao lado). Antes de tirar conclusões sobre biometria ou mesário, confira "Inconsistências" em Dados técnicos.' })] : []),
      ...(d.balanco ? [el('h4', { textContent: 'Balanço 1º → 2º turno (presidente)' }), blocoBalanco(d.balanco)] : []),
      el('h4', { textContent: 'Votos ao longo do dia (a cada 10 min)' }), legenda, tempos,
      tecnico);
  } catch (err) {
    corpo.replaceChildren(el('p', { className: 'erro', textContent: `não foi possível abrir a seção: ${/** @type {Error} */ (err).message}` }));
  }
}

$('an-modal-fechar').addEventListener('click', fecharModal);
$('an-modal').addEventListener('click', (ev) => { if (ev.target === $('an-modal')) fecharModal(); });

$('an-ufs').addEventListener('click', async (ev) => {
  const alvo = /** @type {Element} */ (ev.target);
  const cancelar = /** @type {HTMLButtonElement | null} */ (alvo.closest('button[data-cancelar]'));
  if (cancelar) {
    cancelar.disabled = true;
    try {
      await obterJson(`/api/analise/${cancelar.dataset.cancelar}/cancelar`, { method: 'POST', headers: { 'x-tse-auditor': '1' } });
    } catch (err) {
      $('an-msg').textContent = `não foi possível cancelar: ${/** @type {Error} */ (err).message}`;
    }
    atualizarAnalise();
    return;
  }
  const b = /** @type {HTMLButtonElement | null} */ (alvo.closest('button[data-analisar]'));
  if (!b) {
    const c = /** @type {HTMLElement | null} */ (alvo.closest('[data-escolher]'));
    if (c?.dataset.escolher) {
      $('an-uf').value = c.dataset.escolher;
      renderAnaliseUfs();
      carregarRanking().catch((err) => { $('an-msg').textContent = err.message; });
    }
    return;
  }
  b.disabled = true;
  try {
    await obterJson(`/api/analise/${b.dataset.analisar}/executar`, { method: 'POST', headers: { 'x-tse-auditor': '1' } });
  } catch (err) {
    $('an-msg').textContent = `não foi possível iniciar: ${/** @type {Error} */ (err).message}`;
  }
  atualizarAnalise();
});
$('btn-glossario').addEventListener('click', () => $('gl-modal').showModal());
$('gl-modal-fechar').addEventListener('click', () => $('gl-modal').close());
$('gl-modal').addEventListener('click', (ev) => { if (ev.target === $('gl-modal')) $('gl-modal').close(); });
// Busca pela zona e seção do título de eleitor: abre o detalhe mesmo de seção que não destoou (fora do ranking).
$('an-busca').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const uf = /** @type {HTMLSelectElement} */ ($('an-busca-uf')).value;
  const zona = /** @type {HTMLInputElement} */ ($('an-busca-zona')).value.trim();
  const secao = /** @type {HTMLInputElement} */ ($('an-busca-secao')).value.trim();
  const msg = $('an-busca-msg');
  if (!uf) { msg.textContent = 'nenhuma UF extraída ainda'; return; }
  msg.textContent = 'procurando…';
  try {
    const { secoes } = /** @type {{ secoes: (SecaoRanking & { nome: string | null, achados: number | null })[] }} */ (
      await obterJson(`/api/analise/${uf}/buscar?zona=${encodeURIComponent(zona)}&secao=${encodeURIComponent(secao)}`));
    if (!secoes.length) {
      msg.textContent = `zona ${zona}, seção ${secao} não está nos dados extraídos de ${uf.toUpperCase()}`;
      return;
    }
    const rotulo = (/** @type {typeof secoes[number]} */ s) => `${s.nome ?? `mun ${s.mun}`} · zona ${s.zona} · seção ${s.secao}: `
      + (s.achados == null ? 'UF ainda sem análise' : s.achados ? `${num(s.achados)} achado(s)` : 'nenhum sinal destoante');
    const abrir = (/** @type {typeof secoes[number]} */ s) => abrirSecao(uf, { mun: s.mun, zona: s.zona, secao: s.secao, pontuacao: 0, sinais: [] });
    if (secoes.length === 1) {
      msg.textContent = rotulo(secoes[0]);
      abrir(secoes[0]);
      return;
    }
    msg.replaceChildren(`a zona cobre ${secoes.length} municípios com essa seção: `, ...secoes.map((s) => {
      const b = el('button', { type: 'button', className: 'pequeno', textContent: rotulo(s) });
      b.addEventListener('click', () => abrir(s));
      return b;
    }));
  } catch (err) {
    msg.textContent = `busca: ${/** @type {Error} */ (err).message}`;
  }
});
$('an-sinal').addEventListener('change', () => carregarRanking().catch((err) => { $('an-msg').textContent = err.message; }));
atualizarAnalise();
if (!SITE) setInterval(atualizarAnalise, 3000);

desenharGlossario();

// ---- análise › visão geral: gráficos (Apache ECharts servido em /vendor/echarts.min.js) ----

/**
 * @typedef {{ numero: number, votos: number, pct: number | null }} CandidatoTotal
 * @typedef {{ turno: number, pleito: number, secoes: number, aptos: number, comparecimento: number, abstencao: number,
 *   biometria: number, mesario: number, anoNascimento: number, validos: number, brancos: number, nulos: number,
 *   candidatos: CandidatoTotal[] }} TotaisTurno
 * @typedef {{ escopo: string, ufs: string[], zona: string | null, turnos: TotaisTurno[], zonas: string[],
 *   cobertura: { ufs: string[], semDados: string[], secoes: { turno: number, secoes: number }[] } }} Comparativo
 * @typedef {{ ufs: { uf: string, destoantes: number | null, turnos: { turno: number, abstencaoPct: number | null,
 *   mesarioPct: number | null, validos: number, secoes: number, candidatos: CandidatoTotal[] }[] }[] }} UfsComparacao
 * @typedef {{ id: string, pct1: number, pct2: number, comparecimento1: number, comparecimento2: number,
 *   destoantes: number, destoante: boolean, pontuacao: number | null }} Ponto
 * @typedef {{ uf: string, nivel: string, candidato: number | null, candidatos: number[], pontos: Ponto[], total: number, truncado: boolean }} Dispersao
 * @typedef {{ larguraPct: number, bins: { de: number, ate: number }[], turnos: { turno: number, contagens: number[], secoes: number }[] }} Distribuicao
 * @typedef {{ uf: string, coletado: boolean, secoes?: number, candidatos: CandidatoTotal[], validos: number, brancos: number,
 *   nulos: number, vencedor: number | null, margem: number | null }} UfMapa
 * @typedef {{ turno: number, pleito: number | null, ufs: UfMapa[] }} Mapa
 * @typedef {{ chave: string, total: number }} GrupoMigracao
 * @typedef {{ secoes: number, minimo: number, fontes: GrupoMigracao[], destinos: GrupoMigracao[],
 *   fluxos: { de: string, para: string, fracao: number, votos: number }[], matriz: number[][],
 *   ajuste: { rmse: number, r2: Record<string, number> } | null }} Migracao
 * @typedef {{ secoes: number, eleitorado: number, comparecimento: number, abstencao: number, brancos: number, nulos: number,
 *   nulosTecnicos: number, finalizada: boolean, divulgadoEm: string | null }} TotaisOficiais
 * @typedef {{ uf: string, turno: number, situacao: 'confere' | 'difere' | 'incompleta', secoesFaltando: number,
 *   anuladosNaTotalizacao: number, diferencas: { campo: string, bu: number, oficial: number }[], oficial: TotaisOficiais }} ConferenciaUf
 * @typedef {{ zona: string, secao: string, aptos1: number | null, aptos2: number | null, abstencao1: number | null, abstencao2: number | null }} SecaoTurnos
 * @typedef {ConferenciaUf & { mun: string, nome: string | null, secoes: SecaoTurnos[], eleitoradoOficial: { turno: number, eleitorado: number }[] }} DiferencaMunicipio
 * @typedef {{ cobertura: { turno: number, aptosColetados: number, eleitoradoBrasil: number | null }[],
 *   conferencia: ConferenciaUf[], semOficial: string[], abrangencia: string }} ResumoOficial
 */

const vg = {
  /** @type {string[]} UFs do escopo; vazio = Brasil */ ufs: [],
  zona: '',
  mapaTurno: 2,
  ufsTurno: 2,
  turnosUn: 'pct',
  nivel: 'zona',
  dispUf: '',
  dispCand: '',
  /** @type {string[]} */ disponiveis: [],
  /** @type {Record<string, { nome: string, partido: string }>} */ nomes: {},
  /** @type {Map<number, string>} */ cores: new Map(),
  mapaPronto: false,
  nomesCarregados: false,
  assinatura: '',
  /** @type {{ comp?: Comparativo, ufsComp?: UfsComparacao | null, hist?: Distribuicao, mapa?: Mapa, disp?: Dispersao | null, migracao?: Migracao }} */
  dados: {},
};
// Paleta categórica dos candidatos (mesma cor em todos os gráficos, pela ordem de votos no 1º turno do Brasil coletado).
const PALETA = ['#2f81f7', '#e5534b', '#2da44e', '#a371f7', '#d29922', '#1b9aaa', '#e85aad', '#8c6d46', '#57ab5a', '#c96198', '#4c6ef5', '#b08800'];
const COR_BRANCO = '#9ea7b3';
const COR_NULO = '#6e7781';
const COR_OUTROS = '#768390';
const MAX_CAND = 6;

const temEcharts = () => typeof echarts !== 'undefined';
/** @param {number} n */
const corDe = (n) => {
  if (!vg.cores.has(n)) vg.cores.set(n, PALETA[vg.cores.size % PALETA.length] ?? COR_OUTROS);
  return /** @type {string} */ (vg.cores.get(n));
};
/** @param {number} n */
const nomeCand = (n) => vg.nomes[String(n)]?.nome ?? `Candidato ${n}`;
/** @param {number} n */
const nomeCompleto = (n) => (vg.nomes[String(n)] ? `${vg.nomes[String(n)]?.nome} (${vg.nomes[String(n)]?.partido}, ${n})`
  : Object.keys(vg.nomes).length ? `Candidato ${n} (não consta da lista oficial)` : `Candidato ${n}`);
/** @param {number | null | undefined} v @param {number} [casas] */
const fmtPct = (v, casas = 1) => (v == null || !Number.isFinite(v) ? '—'
  : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`);
/** @param {number} v diferença em fração */
const fmtPP = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;
/** @param {string} hex @param {number} a */
const rgba = (hex, a) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Cores do tema do painel (variáveis CSS), lidas a cada desenho para seguir o modo claro/escuro.
function tema() {
  const cs = getComputedStyle(document.documentElement);
  /** @param {string} n */
  const v = (n) => cs.getPropertyValue(n).trim();
  return { texto: v('--texto'), suave: v('--suave'), borda: v('--borda'), sutil: v('--sutil'), cartao: v('--cartao'), ativo: v('--ativo'), aviso: v('--aviso'), erro: v('--erro') };
}
function base() {
  const t = tema();
  const eixo = { axisLine: { lineStyle: { color: t.borda } }, axisTick: { lineStyle: { color: t.borda } },
    axisLabel: { color: t.suave }, splitLine: { lineStyle: { color: t.sutil } }, nameTextStyle: { color: t.suave } };
  return {
    t, eixo,
    opcao: {
      aria: { enabled: true },
      backgroundColor: 'transparent',
      textStyle: { color: t.texto, fontFamily: 'system-ui, sans-serif' },
      tooltip: { backgroundColor: t.cartao, borderColor: t.borda, textStyle: { color: t.texto }, confine: true },
      legend: { textStyle: { color: t.texto }, top: 0, type: 'scroll', pageTextStyle: { color: t.suave } },
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    },
  };
}

/** @type {Map<string, echarts.ECharts>} */
const graficos = new Map();
// Cliques: UF no mapa entra/sai do escopo; seção na dispersão abre o detalhe.
/** @type {Record<string, (p: { data?: any, name?: string }) => void>} */
const CLIQUES = {
  'g-mapa': (p) => {
    const uf = String(p.name ?? '').toLowerCase();
    if (!vg.disponiveis.includes(uf)) return;
    recarregarEscopo(() => { vg.ufs = vg.ufs.includes(uf) ? vg.ufs.filter((u) => u !== uf) : [...vg.ufs, uf].sort(); vg.zona = ''; });
  },
  'g-dispersao': (p) => {
    const v = p.data;
    if (vg.nivel !== 'secao' || !Array.isArray(v)) return;
    const [mun, zona, secao] = String(v[3]).split('/');
    if (mun && zona && secao) abrirSecao(vg.dispUf, { mun, zona, secao, pontuacao: Number(v[5] ?? 0), sinais: [] });
  },
};
/** @param {string} id */
function grafico(id) {
  let g = graficos.get(id);
  if (!g) {
    const alvo = $(id);
    alvo.replaceChildren();
    g = echarts.init(alvo, null, { renderer: 'canvas' });
    graficos.set(id, g);
    const inst = g;
    new ResizeObserver(() => inst.resize()).observe(alvo);
    const clique = CLIQUES[id];
    if (clique) g.on('click', clique);
  }
  return g;
}
/** @param {string} id @param {string} msg */
function vazio(id, msg) {
  graficos.get(id)?.dispose();
  graficos.delete(id);
  $(id).replaceChildren(el('div', { className: 'vazio', textContent: msg }));
}
/** @param {string} id @param {Record<string, unknown>} opcao */
const desenhar = (id, opcao) => grafico(id).setOption(opcao, true);

const escopoQs = () => (vg.ufs.length ? `escopo=uf&ufs=${vg.ufs.join(',')}${vg.zona ? `&zona=${encodeURIComponent(vg.zona)}` : ''}` : 'escopo=brasil');
const nomeEscopo = () => (vg.ufs.length ? vg.ufs.map((u) => u.toUpperCase()).join(', ') + (vg.zona ? ` · zona ${vg.zona}` : '')
  : `${vg.disponiveis.length} UFs coletadas`);
/** @param {number} d diferença inteira, com sinal */
const fmtDif = (d) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${num(Math.abs(d))}`;

function renderEscopo() {
  $('vg-brasil').setAttribute('aria-pressed', String(!vg.ufs.length));
  $('vg-ufs').replaceChildren(...vg.disponiveis.map((uf) => {
    const b = el('button', { type: 'button', className: 'chip', textContent: uf.toUpperCase(), title: `incluir/retirar ${uf.toUpperCase()} do escopo` });
    b.dataset.uf = uf;
    b.setAttribute('aria-pressed', String(vg.ufs.includes(uf)));
    return b;
  }));
  $('vg-zona-rotulo').hidden = vg.ufs.length !== 1;
}

// KPIs do escopo, por turno: valor do 2º turno em destaque, os dois turnos e a variação. A variação fica em cor neutra:
// subir ou descer não é bom nem ruim por si (destoar não é prova de nada).
/** @param {Comparativo} c */
function renderKpis(c) {
  const [t1, t2] = c.turnos;
  /** @param {number} a @param {number} b */
  const q = (a, b) => (b ? a / b : null);
  /** @param {string} rotulo @param {(t: TotaisTurno) => number | null} f @param {'pct' | 'num'} tipo */
  const cartao = (rotulo, f, tipo) => {
    const a = t1 ? f(t1) : null;
    const b = t2 ? f(t2) : null;
    const fmt = (/** @type {number | null} */ v) => (v == null ? '—' : tipo === 'pct' ? fmtPct(v) : num(v));
    const d = a != null && b != null ? b - a : null;
    return el('div', { className: 'cartao' }, el('span', { textContent: rotulo }),
      el('strong', { textContent: fmt(b ?? a) }),
      el('small', { textContent: `1º: ${fmt(a)} · 2º: ${fmt(b)}` }),
      ...(d == null ? [] : [el('small', { className: 'delta', textContent: `Variação: ${tipo === 'pct' ? fmtPP(d) : fmtDif(d)}` })]));
  };
  $('vg-kpis').replaceChildren(
    cartao('Votos recebidos', (t) => t.comparecimento, 'num'),
    cartao('Comparecimento', (t) => q(t.comparecimento, t.aptos), 'pct'),
    cartao('Abstenção', (t) => q(t.abstencao, t.aptos), 'pct'),
    cartao('Liberação pelo mesário', (t) => q(t.mesario, t.comparecimento), 'pct'),
    cartao('Liberação por ano de nascimento', (t) => q(t.anoNascimento, t.comparecimento), 'pct'),
    cartao('Biometria', (t) => q(t.biometria, t.comparecimento), 'pct'));
}

// Tabela com todos os totais do escopo nos dois turnos, para ler os números sem depender dos gráficos.
/** @param {Comparativo} c */
function renderTotais(c) {
  const [t1, t2] = c.turnos;
  if (!t1 && !t2) return $('vg-totais').replaceChildren(el('p', { className: 'dica', textContent: 'sem dados para o escopo' }));
  /** @param {number | null | undefined} a @param {number | null | undefined} b */
  const q = (a, b) => (a != null && b ? a / b : null);
  /** @param {number | null | undefined} v @param {number | null} [p] */
  const cel = (v, p = null) => el('td', {}, v == null ? '—' : num(v), ...(p == null ? [] : [el('span', { className: 'pct', textContent: `(${fmtPct(p)})` })]));
  /** @param {string} rotulo @param {(t: TotaisTurno) => number | null | undefined} f @param {((t: TotaisTurno) => number | null) | null} [p] */
  const linha = (rotulo, f, p = null) => {
    const a = t1 ? f(t1) : null;
    const b = t2 ? f(t2) : null;
    const pa = t1 && p ? p(t1) : null;
    const pb = t2 && p ? p(t2) : null;
    const variacao = a == null || b == null ? '—' : p && pa != null && pb != null ? `${fmtDif(b - a)} · ${fmtPP(pb - pa)}` : fmtDif(b - a);
    return el('tr', {}, el('td', { textContent: rotulo }), cel(a, pa), cel(b, pb), el('td', { className: 'var', textContent: variacao }));
  };
  /** @param {string} t */
  const grupo = (t) => el('tr', { className: 'grupo' }, el('td', { colSpan: 4, textContent: t }));
  const ordem = [...(t1 ?? t2)?.candidatos ?? []].map((x) => x.numero);
  for (const x of t2?.candidatos ?? []) if (!ordem.includes(x.numero)) ordem.push(x.numero);
  /** @param {TotaisTurno} t @param {number} n */
  const cand = (t, n) => t.candidatos.find((x) => x.numero === n);
  const linhasCand = ordem.map((n) => {
    const tr = linha(nomeCompleto(n), (t) => (t === t2 && !cand(t, n) ? null : cand(t, n)?.votos ?? 0), (t) => cand(t, n)?.pct ?? null);
    tr.firstElementChild?.prepend(el('i', { className: 'cor-cand', style: `background:${corDe(n)}` }));
    return tr;
  });
  $('vg-totais').replaceChildren(el('table', { className: 'totais' },
    el('thead', {}, el('tr', {}, el('th', { textContent: '' }), el('th', { textContent: '1º turno' }), el('th', { textContent: '2º turno' }), el('th', { textContent: 'Variação' }))),
    el('tbody', {},
      grupo('Eleitorado'),
      linha('Seções', (t) => t.secoes),
      linha('Eleitores aptos', (t) => t.aptos),
      linha('Votos recebidos (comparecimento)', (t) => t.comparecimento, (t) => q(t.comparecimento, t.aptos)),
      linha('Abstenção', (t) => t.abstencao, (t) => q(t.abstencao, t.aptos)),
      grupo('Habilitação do eleitor na urna'),
      linha('Biometria', (t) => t.biometria, (t) => q(t.biometria, t.comparecimento)),
      linha('Liberação pelo mesário', (t) => t.mesario, (t) => q(t.mesario, t.comparecimento)),
      linha('Liberação por ano de nascimento', (t) => t.anoNascimento, (t) => q(t.anoNascimento, t.comparecimento)),
      grupo('Presidente'),
      linha('Votos válidos', (t) => t.validos, (t) => q(t.validos, t.comparecimento)),
      ...linhasCand,
      linha('Brancos', (t) => t.brancos, (t) => q(t.brancos, t.comparecimento)),
      linha('Nulos', (t) => t.nulos, (t) => q(t.nulos, t.comparecimento)))));
}

// Soma dos BUs × resultado divulgado pelo TSE, por UF e turno.
/** @param {ResumoOficial | null} r */
function renderOficial(r) {
  const alvo = $('vg-oficial');
  if (!r) return alvo.replaceChildren(el('p', { className: 'dica', textContent: 'conferência indisponível' }));
  if (r.abrangencia === 'zona') return alvo.replaceChildren(el('p', { className: 'dica', textContent: 'O TSE não divulga resultado por zona; escolha a UF inteira para conferir.' }));
  if (!r.conferencia.length) {
    return alvo.replaceChildren(el('p', { className: 'dica',
      textContent: r.semOficial.length ? `Sem acesso aos arquivos oficiais do TSE (${r.semOficial.join(', ')}). Tente de novo mais tarde.` : 'sem dados para conferir' }));
  }
  const ufs = [...new Set(r.conferencia.map((x) => x.uf))];
  /** @param {ConferenciaUf | undefined} x */
  const celula = (x) => {
    if (!x) return el('td', { textContent: '—' });
    const rotulo = x.situacao === 'confere' ? 'confere' : x.situacao === 'difere' ? 'difere' : `incompleta: faltam ${num(x.secoesFaltando)} seções`;
    const difs = x.diferencas.map((d) => el('li', { textContent: `${d.campo}: BU ${num(d.bu)} · TSE ${num(d.oficial)} (${fmtDif(d.oficial - d.bu)} no TSE)` }));
    const td = el('td', {}, el('span', { className: `selo-of ${x.situacao}`, textContent: rotulo }), ...(difs.length ? [el('ul', {}, ...difs)] : []));
    if (x.situacao === 'difere' && r.abrangencia === 'uf') {
      const b = el('button', { type: 'button', className: 'pequeno', textContent: 'Localizar município',
        title: 'confere cada município da UF com o arquivo oficial do município (algumas centenas de consultas ao TSE, 4 por vez)' });
      const saida = el('div', { className: 'localizar' });
      b.addEventListener('click', () => localizarMunicipios(x.uf, x.turno, b, saida));
      td.append(b, saida);
    }
    return td;
  };
  const anulados = [1, 2].map((t) => ({ t, n: r.conferencia.filter((x) => x.turno === t).reduce((a, x) => a + x.anuladosNaTotalizacao, 0) })).filter((x) => x.n);
  const datas = [...new Set(r.conferencia.map((x) => x.oficial.divulgadoEm?.slice(0, 10)).filter(Boolean))];
  const parciais = r.conferencia.some((x) => !x.oficial.finalizada);
  const contagem = { confere: 0, difere: 0, incompleta: 0 };
  for (const x of r.conferencia) contagem[x.situacao]++;
  alvo.replaceChildren(
    el('p', {}, `${num(contagem.confere)} conferem · ${num(contagem.difere)} diferem · ${num(contagem.incompleta)} incompletas`
      + ` (${r.abrangencia === 'municipio' ? 'município' : 'UF'} × turno)`),
    el('table', { className: 'oficial' },
      el('thead', {}, el('tr', {}, el('th', { textContent: 'UF' }), el('th', { textContent: '1º turno' }), el('th', { textContent: '2º turno' }))),
      el('tbody', {}, ...ufs.map((uf) => el('tr', {}, el('td', { className: 'uf', textContent: uf.toUpperCase() }),
        celula(r.conferencia.find((x) => x.uf === uf && x.turno === 1)), celula(r.conferencia.find((x) => x.uf === uf && x.turno === 2)))))),
    ...anulados.map((a) => el('p', { className: 'dica',
      textContent: `${a.t}º turno: ${num(a.n)} votos digitados para candidato que não está na lista oficial (retirado depois da carga das urnas) foram anulados pelo TSE na totalização ("nulos técnicos"); o total confere com o divulgado.` })),
    el('p', { className: 'dica', textContent: `Fonte: arquivos de resultado de presidente do TSE${datas.length ? `, gerados em ${datas.join(' e ')}` : ''}.${parciais ? ' Atenção: totalização ainda não finalizada em algum arquivo.' : ''}`
      + `${r.semOficial.length ? ` Sem arquivo oficial: ${r.semOficial.join(', ')}.` : ''}` }));
}

// Aptos de cada seção do município nos dois turnos, a soma das urnas e o eleitorado oficial de cada turno.
/** @param {DiferencaMunicipio} d */
function blocoSecoesTurnos(d) {
  /** @param {number | null} a @param {number | null} b */
  const dif = (a, b) => (a == null || b == null ? null : b - a);
  /** @param {keyof SecaoTurnos} k */
  const soma = (k) => d.secoes.reduce((a, x) => a + Number(x[k] ?? 0), 0);
  const of = (/** @type {number} */ t) => d.eleitoradoOficial.find((x) => x.turno === t)?.eleitorado;
  const mudaram = d.secoes.filter((x) => (dif(x.aptos1, x.aptos2) ?? 0) !== 0);
  /** @param {number | null | undefined} v */
  const n = (v) => (v == null ? '—' : num(v));
  /** @param {number | null} v */
  const v = (v) => (v == null ? '—' : fmtDif(v));
  return el('div', {},
    el('p', { className: 'dica', textContent: `Aptos por urna nos dois turnos. ${mudaram.length ? `${num(mudaram.length)} de ${num(d.secoes.length)} seções mudaram de número de eleitores entre os turnos (em destaque).` : 'Nenhuma seção mudou de número de eleitores entre os turnos.'}` }),
    el('div', { className: 'rolavel' }, el('table', { className: 'totais secoes-turnos' },
      el('thead', {}, el('tr', {}, el('th', { textContent: 'Zona / seção' }), el('th', { textContent: 'Aptos 1º' }), el('th', { textContent: 'Aptos 2º' }),
        el('th', { textContent: 'Variação' }), el('th', { textContent: 'Abstenção 1º' }), el('th', { textContent: 'Abstenção 2º' }))),
      el('tbody', {},
        ...d.secoes.map((x) => el('tr', { className: (dif(x.aptos1, x.aptos2) ?? 0) !== 0 ? 'mudou' : '' },
          el('td', { textContent: `${x.zona} / ${x.secao}` }), el('td', { textContent: n(x.aptos1) }), el('td', { textContent: n(x.aptos2) }),
          el('td', { textContent: v(dif(x.aptos1, x.aptos2)) }), el('td', { textContent: n(x.abstencao1) }), el('td', { textContent: n(x.abstencao2) }))),
        el('tr', { className: 'soma' }, el('td', { textContent: 'Soma das urnas (BU)' }), el('td', { textContent: num(soma('aptos1')) }),
          el('td', { textContent: num(soma('aptos2')) }), el('td', { textContent: v(soma('aptos2') - soma('aptos1')) }),
          el('td', { textContent: num(soma('abstencao1')) }), el('td', { textContent: num(soma('abstencao2')) })),
        el('tr', { className: 'soma' }, el('td', { textContent: 'Eleitorado divulgado pelo TSE' }), el('td', { textContent: n(of(1)) }),
          el('td', { textContent: n(of(2)) }), el('td', { textContent: '' }), el('td', { textContent: '' }), el('td', { textContent: '' }))))),
    el('p', { className: 'dica', textContent: 'Uma explicação candidata para o eleitorado oficial maior que a soma das urnas: eleitores incluídos ou regularizados no cadastro depois da carga das urnas, que o TSE conta como aptos e ausentes. Para confirmar, consulte a estatística do eleitorado do TSE ou pergunte ao TRE pela Lei de Acesso à Informação.' }));
}

/**
 * @param {string} uf @param {number} turno @param {HTMLButtonElement} botao @param {HTMLElement} saida
 */
async function localizarMunicipios(uf, turno, botao, saida) {
  botao.disabled = true;
  saida.textContent = 'conferindo município a município…';
  try {
    /** @type {{ municipios: number, diferencas: DiferencaMunicipio[], semOficial: string[] }} */
    const r = await obterJson(`/api/analise/oficial-municipios?uf=${uf}&turno=${turno}`);
    saida.replaceChildren(
      el('p', { className: 'dica', textContent: `${num(r.municipios)} municípios conferidos; ${num(r.diferencas.length)} com diferença`
        + `${r.semOficial.length ? `; ${num(r.semOficial.length)} sem arquivo oficial` : ''}.` }),
      ...r.diferencas.map((d) => el('div', { className: 'mun-diferenca' },
        el('p', {}, el('strong', { textContent: `${d.nome ?? 'município'} (${d.mun})` }),
          `: ${d.diferencas.map((x) => `${x.campo} BU ${num(x.bu)} · TSE ${num(x.oficial)}`).join('; ')}`),
        blocoSecoesTurnos(d))));
  } catch (err) {
    saida.textContent = `não foi possível localizar: ${/** @type {Error} */ (err).message}`;
    botao.disabled = false;
  }
}

// Cobertura do escopo e aviso quando "todas as UFs coletadas" não é o país inteiro.
/** @param {Comparativo} c @param {ResumoOficial | null} r */
function renderCobertura(c, r) {
  const sec = c.cobertura.secoes.map((s) => `${s.turno}º turno: ${num(s.secoes)} seções`).join(' · ');
  $('vg-cobertura').textContent = `${nomeEscopo()} — ${sec || 'sem seções'}. UFs com dados: ${c.cobertura.ufs.map((u) => u.toUpperCase()).join(', ') || 'nenhuma'}`
    + `${c.cobertura.semDados.length ? `; sem dados: ${c.cobertura.semDados.length} UFs` : ''}. Votos de presidente pelo BU.`;
  const cob = r?.cobertura.find((x) => x.turno === 2) ?? r?.cobertura[0];
  const faltam = c.cobertura.semDados.length;
  const alerta = $('vg-alerta-cobertura');
  alerta.hidden = !faltam;
  if (!faltam) return;
  const pctPais = cob?.eleitoradoBrasil ? ` = ${fmtPct(cob.aptosColetados / cob.eleitoradoBrasil)} do eleitorado do país (${num(cob.aptosColetados)} de ${num(cob.eleitoradoBrasil)} aptos, pelo TSE)` : '';
  alerta.textContent = `Os números somam só as ${vg.disponiveis.length} UFs já extraídas${pctPais}. Não é o resultado nacional: faltam ${faltam} UFs. `
    + (vg.ufs.length ? 'O escopo atual é um recorte dessas UFs.' : 'A proporção entre candidatos depende de quais UFs entraram.');
}

/** @param {Comparativo} c */
function renderTurnos(c) {
  if (!c.turnos.length) return vazio('g-turnos', 'sem dados para o escopo');
  const [t1, t2] = c.turnos;
  const ordem = [...(t1 ?? t2)?.candidatos ?? []].map((x) => x.numero);
  for (const x of t2?.candidatos ?? []) if (!ordem.includes(x.numero)) ordem.push(x.numero);
  const principais = ordem.slice(0, MAX_CAND);
  const temOutros = ordem.length > MAX_CAND;
  const cats = [...principais.map((n) => ({ chave: `c${n}`, rotulo: nomeCand(n), cor: corDe(n) })),
    ...(temOutros ? [{ chave: 'outros', rotulo: 'Outros', cor: COR_OUTROS }] : []),
    { chave: 'brancos', rotulo: 'Brancos', cor: COR_BRANCO }, { chave: 'nulos', rotulo: 'Nulos', cor: COR_NULO }];
  /** @param {TotaisTurno | undefined} t @param {string} chave */
  const votos = (t, chave) => {
    if (!t) return null;
    if (chave === 'brancos') return t.brancos;
    if (chave === 'nulos') return t.nulos;
    if (chave === 'outros') return t.candidatos.filter((x) => !principais.includes(x.numero)).reduce((a, x) => a + x.votos, 0);
    return t.candidatos.find((x) => `c${x.numero}` === chave)?.votos ?? 0;
  };
  const pctMode = vg.turnosUn === 'pct';
  // quem não foi ao 2º turno fica sem a barra do 2º (em vez de uma barra zerada)
  const noSegundo = new Set((t2?.candidatos ?? []).map((x) => `c${x.numero}`));
  /** @param {TotaisTurno | undefined} t @param {string} nome @param {number} opac @param {boolean} segundo */
  const serie = (t, nome, opac, segundo) => ({
    name: nome, type: 'bar', barGap: '10%', itemStyle: { color: rgba('#768390', opac) },
    label: { show: true, position: 'right', color: tema().suave, fontSize: 11,
      formatter: (/** @type {{ value: number | null }} */ p) => (p.value == null ? '' : pctMode ? fmtPct(p.value) : num(p.value)) },
    data: cats.map((k) => {
      const v = votos(t, k.chave);
      const ausente = segundo && k.chave.startsWith('c') && !noSegundo.has(k.chave);
      return { value: v == null || ausente ? null : pctMode ? (t?.comparecimento ? v / t.comparecimento : 0) : v, itemStyle: { color: rgba(k.cor, opac) } };
    }),
  });
  const { opcao, eixo } = base();
  $('g-turnos').style.height = `${Math.max(320, 60 + cats.length * (t2 ? 44 : 28))}px`;
  grafico('g-turnos').resize();
  desenhar('g-turnos', {
    ...opcao,
    grid: { ...opcao.grid, right: 72 },
    tooltip: { ...opcao.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (/** @type {any[]} */ ps) => `<b>${esc(ps[0]?.name)}</b><br>${ps.map((p) => {
        const t = c.turnos[p.seriesIndex];
        const v = votos(t, cats[p.dataIndex]?.chave ?? '');
        return `${esc(p.seriesName)}: ${v == null ? '—' : `${num(v)} votos (${fmtPct(t?.comparecimento ? v / t.comparecimento : null)} do comparecimento)`}`;
      }).join('<br>')}` },
    yAxis: { type: 'category', inverse: true, data: cats.map((k) => k.rotulo), ...eixo, axisLabel: { ...eixo.axisLabel, interval: 0, width: 190, overflow: 'break' } },
    xAxis: { type: 'value', ...eixo, axisLabel: { ...eixo.axisLabel, formatter: (/** @type {number} */ v) => (pctMode ? fmtPct(v, 0) : num(v)) } },
    series: [serie(t1, '1º turno', 0.4, false), ...(t2 ? [serie(t2, '2º turno', 1, true)] : [])],
  });
}

/** @param {UfsComparacao | null | undefined} u */
function renderUfs(u) {
  if (!u || u.ufs.length < 2) return vazio('g-ufs', 'Escolha Brasil ou duas ou mais UFs para comparar.');
  const turno = vg.ufsTurno;
  const linhasT = u.ufs.map((x) => ({ uf: x.uf, destoantes: x.destoantes, t: x.turnos.find((y) => y.turno === turno) }));
  /** @type {Map<number, number>} */
  const soma = new Map();
  for (const l of linhasT) for (const c of l.t?.candidatos ?? []) soma.set(c.numero, (soma.get(c.numero) ?? 0) + c.votos);
  const cands = [...soma.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_CAND).map(([n]) => n);
  const { opcao, eixo, t } = base();
  desenhar('g-ufs', {
    ...opcao,
    tooltip: { ...opcao.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (/** @type {any[]} */ ps) => {
        const l = linhasT[ps[0]?.dataIndex ?? 0];
        return `<b>${esc(l?.uf.toUpperCase())}</b> · ${turno}º turno<br>${ps.map((p) => `${p.marker}${esc(p.seriesName)}: ${fmtPct(p.value)}`).join('<br>')}`
          + `<br>Seções destoantes: ${l?.destoantes == null ? 'sem análise' : num(l.destoantes)}`;
      } },
    xAxis: { type: 'category', data: linhasT.map((l) => l.uf.toUpperCase()), ...eixo },
    yAxis: { type: 'value', max: 1, ...eixo, axisLabel: { ...eixo.axisLabel, formatter: (/** @type {number} */ v) => fmtPct(v, 0) } },
    series: [
      ...cands.map((n) => ({ name: nomeCand(n), type: 'bar', itemStyle: { color: corDe(n) },
        data: linhasT.map((l) => l.t?.candidatos.find((c) => c.numero === n)?.pct ?? null) })),
      { name: 'Abstenção', type: 'scatter', symbol: 'diamond', symbolSize: 12, itemStyle: { color: t.texto }, data: linhasT.map((l) => l.t?.abstencaoPct ?? null) },
      { name: 'Mesário', type: 'scatter', symbol: 'triangle', symbolSize: 12, itemStyle: { color: t.aviso }, data: linhasT.map((l) => l.t?.mesarioPct ?? null) },
    ],
  });
}

/** @param {Distribuicao} h */
function renderHist(h) {
  if (!h.turnos.length || !h.turnos.some((t) => t.secoes)) return vazio('g-hist', 'sem seções no escopo');
  const { opcao, eixo, t } = base();
  const rotulos = h.bins.map((b) => `${b.de}–${b.ate}%`);
  desenhar('g-hist', {
    ...opcao,
    tooltip: { ...opcao.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (/** @type {any[]} */ ps) => `<b>${esc(ps[0]?.name)}</b> liberados pelo mesário<br>${ps.map((p) => `${p.marker}${esc(p.seriesName)}: ${num(p.value)} seções`).join('<br>')}` },
    xAxis: { type: 'category', data: rotulos, name: '% do comparecimento', nameLocation: 'middle', nameGap: 28, ...eixo },
    yAxis: { type: 'value', name: 'seções', ...eixo, axisLabel: { ...eixo.axisLabel, formatter: (/** @type {number} */ v) => num(v) } },
    grid: { ...opcao.grid, bottom: 28 },
    series: h.turnos.map((x) => ({ name: `${x.turno}º turno (${num(x.secoes)} seções)`, type: 'bar', barGap: '0%', barCategoryGap: '10%',
      itemStyle: { color: x.turno === 1 ? rgba(t.ativo.startsWith('#') ? t.ativo : '#2f81f7', 0.45) : t.aviso }, data: x.contagens })),
  });
}

// Intensidade do mapa em faixas fixas de margem (mesmas da legenda), em vez de escala contínua sem referência.
const FAIXAS_MARGEM = [
  { ate: 0.05, alfa: 0.3, rotulo: 'até 5 p.p.' }, { ate: 0.15, alfa: 0.5, rotulo: '5–15' },
  { ate: 0.3, alfa: 0.75, rotulo: '15–30' }, { ate: Infinity, alfa: 1, rotulo: '30 p.p. ou mais' },
];
/** @param {number} m */
const alfaMargem = (m) => (FAIXAS_MARGEM.find((f) => m < f.ate) ?? FAIXAS_MARGEM[3])?.alfa ?? 1;

/** @param {Mapa} m */
function renderMapa(m) {
  if (!vg.mapaPronto) return;
  const { opcao, t } = base();
  const porUf = new Map(m.ufs.map((u) => [u.uf.toUpperCase(), u]));
  const dados = m.ufs.filter((u) => u.uf !== 'zz').map((u) => {
    const cor = u.vencedor == null ? null : corDe(u.vencedor);
    return { name: u.uf.toUpperCase(), value: u.margem ?? 0,
      itemStyle: cor ? { areaColor: rgba(cor, alfaMargem(u.margem ?? 0)), borderColor: t.borda }
        : { areaColor: 'transparent', borderColor: t.suave, borderType: 'dashed' } };
  });
  desenhar('g-mapa', {
    ...opcao,
    tooltip: { ...opcao.tooltip, trigger: 'item', formatter: (/** @type {any} */ p) => {
      const u = porUf.get(p.name);
      if (!u || !u.coletado) return `<b>${esc(p.name)}</b><br>não coletado`;
      const lin = u.candidatos.slice(0, 5).map((c) => `<span style="color:${corDe(c.numero)}">●</span> ${esc(nomeCompleto(c.numero))}: ${num(c.votos)} (${fmtPct(c.pct)})`);
      return `<b>${esc(p.name)}</b> · ${m.turno}º turno · ${num(u.secoes ?? 0)} seções<br>${lin.join('<br>')}`
        + `${u.candidatos.length > 5 ? `<br>+${u.candidatos.length - 5} candidatos` : ''}<br>Brancos ${num(u.brancos)} · Nulos ${num(u.nulos)}`
        + `<br>Margem: ${fmtPP(u.margem ?? 0).replace('+', '')}`;
    } },
    series: [{ type: 'map', map: 'BR', roam: false, selectedMode: false, showLegendSymbol: false, data: dados, aspectScale: 1,
      label: { show: true, color: t.texto, fontSize: 10 },
      emphasis: { label: { color: t.texto }, itemStyle: { borderColor: t.texto, borderWidth: 1.5 } } }],
  });
  const vencedores = [...new Set(m.ufs.map((u) => u.vencedor).filter((n) => n != null))];
  const zz = porUf.get('ZZ');
  $('vg-mapa-legenda').replaceChildren(
    ...vencedores.map((n) => el('span', {}, el('i', { style: `background:${corDe(/** @type {number} */ (n))}` }), nomeCompleto(/** @type {number} */ (n)))),
    el('span', {}, el('i', { style: `background:transparent;border:1px dashed ${t.suave}` }), 'não coletado'),
    el('span', { className: 'dica', textContent: `Exterior (ZZ): ${zz?.coletado ? `${nomeCand(/** @type {number} */ (zz.vencedor))}, margem ${fmtPP(zz.margem ?? 0).replace('+', '')}` : 'não coletado'}` }));
  $('vg-mapa-margem').replaceChildren(el('span', { className: 'dica', textContent: 'Margem sobre o 2º: ' }),
    ...FAIXAS_MARGEM.map((f) => el('span', {}, el('i', { style: `background:${rgba('#768390', f.alfa)}` }), f.rotulo)));
}

/** @param {Dispersao | null | undefined} d */
function renderDispersao(d) {
  if (!d || !d.pontos.length) return vazio('g-dispersao', vg.disponiveis.length ? 'Sem pontos: a UF precisa dos dois turnos extraídos.' : 'Nenhuma UF extraída ainda.');
  const { opcao, eixo, t } = base();
  const xs = d.pontos.flatMap((p) => [p.pct1, p.pct2]);
  const lo = Math.max(0, Math.floor(Math.min(...xs) * 20) / 20);
  const hi = Math.min(1, Math.ceil(Math.max(...xs) * 20) / 20);
  /** @param {Ponto} p */
  const ponto = (p) => [p.pct1, p.pct2, p.comparecimento2, p.id, p.destoantes, p.pontuacao];
  const cor = corDe(/** @type {number} */ (d.candidato));
  const porSecao = d.nivel === 'secao';
  const eixoPct = (/** @type {string} */ nome) => ({ type: 'value', min: lo, max: hi, name: nome, nameLocation: 'middle', nameGap: 32, ...eixo,
    axisLabel: { ...eixo.axisLabel, formatter: (/** @type {number} */ v) => fmtPct(v, 0) } });
  desenhar('g-dispersao', {
    ...opcao,
    grid: { ...opcao.grid, left: 16, bottom: 24 },
    tooltip: { ...opcao.tooltip, trigger: 'item', formatter: (/** @type {any} */ p) => {
      if (!Array.isArray(p.value)) return '';
      const [a, b, , id, n, pont] = p.value;
      return `<b>${porSecao ? `Seção ${esc(String(id).split('/').join(' · '))}` : `Zona ${esc(id)}`}</b><br>${esc(nomeCand(/** @type {number} */ (d.candidato)))}: `
        + `${fmtPct(a)} → ${fmtPct(b)} (${fmtPP(b - a)})<br>`
        + `${n ? `${porSecao ? 'Com achados' : `${num(n)} seções com achados`} · pontuação máx. ${pont ?? '—'}` : 'Sem achados'}${porSecao ? '<br><i>clique para ver o detalhe</i>' : ''}`;
    } },
    xAxis: eixoPct('1º turno (% dos válidos)'),
    yAxis: eixoPct('2º turno'),
    series: [
      { name: 'Sem achados', type: 'scatter', large: d.pontos.length > 3000, symbolSize: porSecao ? 4 : 8,
        itemStyle: { color: rgba(cor, 0.45) }, data: d.pontos.filter((p) => !p.destoante).map(ponto),
        markLine: { silent: true, symbol: 'none', lineStyle: { color: t.suave, type: 'dashed' }, label: { show: false },
          data: [[{ coord: [lo, lo] }, { coord: [hi, hi] }]] } },
      { name: 'Com achados', type: 'scatter', symbolSize: porSecao ? 7 : 11,
        itemStyle: { color: t.erro, borderColor: t.cartao, borderWidth: 1 }, data: d.pontos.filter((p) => p.destoante).map(ponto) },
    ],
  });
  $('vg-disp-nota').textContent = `${num(d.pontos.length)} ${porSecao ? 'seções' : 'zonas'}${d.truncado ? ` (de ${num(d.total)}; as de maior pontuação primeiro)` : ''}. `
    + 'Na diagonal, o candidato teve a mesma proporção nos dois turnos. Em destaque: com achados.'
    + (porSecao ? ' Clique numa seção para ver o detalhe.' : '');
}

/** @param {string} k */
const corChave = (k) => (/^c\d+$/.test(k) ? corDe(Number(k.slice(1))) : k === 'branco_nulo' ? COR_BRANCO : k === 'outros' ? COR_OUTROS : COR_NULO);

// Sankey 1º → 2º turno e a matriz (% de cada grupo do 1º turno que foi para cada destino do 2º).
/** @param {Migracao} m */
function renderMigracao(m) {
  const tabela = $('vg-migracao-tabela');
  if (!m.ajuste) {
    tabela.replaceChildren();
    return vazio('g-migracao', m.secoes
      ? `Poucas seções com os dois turnos no escopo (${num(m.secoes)}; mínimo ${num(m.minimo)}).`
      : 'Sem seções com os dois turnos extraídos no escopo.');
  }
  const { t, opcao } = base();
  const n1 = (/** @type {string} */ k) => `1º · ${rotuloChave(k)}`;
  const n2 = (/** @type {string} */ k) => `2º · ${rotuloChave(k)}`;
  const total = m.fontes.reduce((s, f) => s + f.total, 0);
  const links = m.fluxos.filter((f) => f.votos > 0 && f.votos >= total * 0.001).map((f) => ({
    source: n1(f.de), target: n2(f.para), value: f.votos, fracao: f.fracao, de: f.de,
    lineStyle: { color: corChave(f.de), opacity: 0.35 },
  }));
  desenhar('g-migracao', {
    ...opcao,
    legend: undefined,
    tooltip: { ...opcao.tooltip, trigger: 'item', formatter: (/** @type {any} */ p) => (p.dataType === 'edge'
      ? `${esc(p.data.source)} → ${esc(p.data.target)}<br><b>~${num(p.data.value)}</b> votos estimados (${fmtPct(p.data.fracao)} do grupo)`
      : `${esc(p.name)}<br>${num(Math.round(p.value))} votos`) },
    series: [{
      type: 'sankey', left: 8, right: 150, top: 8, bottom: 8, nodeGap: 10, nodeAlign: 'justify', draggable: false,
      emphasis: { focus: 'adjacency' },
      label: { color: t.texto, fontSize: 12 },
      data: [...m.fontes.map((f) => ({ name: n1(f.chave), itemStyle: { color: corChave(f.chave), borderColor: corChave(f.chave) } })),
        ...m.destinos.map((d) => ({ name: n2(d.chave), itemStyle: { color: corChave(d.chave), borderColor: corChave(d.chave) } }))],
      links,
    }],
  });
  tabela.replaceChildren(el('table', { className: 'comparacao' },
    el('thead', {}, el('tr', {}, el('th', { textContent: '1º turno → 2º turno' }), ...m.destinos.map((d) => el('th', { textContent: rotuloChave(d.chave) })))),
    el('tbody', {}, ...m.fontes.map((f, i) => el('tr', {},
      el('th', { textContent: `${rotuloChave(f.chave)} (${num(f.total)})` }),
      ...m.destinos.map((d, k) => {
        const fr = m.matriz[i]?.[k] ?? 0;
        return el('td', { className: fr >= 0.5 ? 'forte' : '', textContent: fr < 0.0005 ? '—' : `${fmtPct(fr, 0)} (~${num(Math.round(fr * f.total))})` });
      }))))));
  const r2 = m.destinos.filter((d) => d.chave.startsWith('c')).map((d) => `${rotuloChave(d.chave)} ${fmtPct(m.ajuste?.r2[d.chave], 0)}`).join(', ');
  $('vg-migracao-nota').textContent = `Estimativa estatística (inferência ecológica) sobre ${num(m.secoes)} seções do escopo: compara, seção a seção, `
    + 'o resultado do 1º turno com o do 2º e encontra a divisão de cada grupo que melhor explica todas as seções juntas. Cada linha da tabela soma 100%. '
    + `Erro médio por seção: ${fmtPP(m.ajuste.rmse).replace(/^[+−±]/, '')}; quanto da variação entre seções o modelo explica: ${r2}. `
    + 'Vale para o conjunto, nunca para uma seção ou um eleitor (o voto é secreto); números pequenos (poucas seções, zona única) são menos confiáveis.';
}

function redesenhar() {
  if (!temEcharts()) return;
  const d = vg.dados;
  if (d.comp) renderTurnos(d.comp);
  renderUfs(d.ufsComp);
  if (d.hist) renderHist(d.hist);
  if (d.mapa) renderMapa(d.mapa);
  renderDispersao(d.disp);
  if (d.migracao) renderMigracao(d.migracao);
}

/** @param {string} id @param {unknown} err */
const falhou = (id, err) => vazio(id, `não foi possível carregar: ${/** @type {Error} */ (err).message}`);

async function carregarMapa() {
  try {
    if (!vg.mapaPronto) {
      echarts.registerMap('BR', await obterJson('mapa-br.json'));
      vg.mapaPronto = true;
    }
    vg.dados.mapa = await obterJson(`/api/analise/mapa?turno=${vg.mapaTurno}`);
    renderMapa(/** @type {Mapa} */ (vg.dados.mapa));
  } catch (err) { falhou('g-mapa', err); }
}

async function carregarEscopo() {
  const ufsQs = vg.ufs.join(',');
  try {
    const c = /** @type {Comparativo} */ (await obterJson(`/api/analise/comparativo?${escopoQs()}`));
    vg.dados.comp = c;
    renderCobertura(c, null);
    if (vg.ufs.length === 1) {
      $('vg-zona').replaceChildren(el('option', { value: '', textContent: 'todas' }), ...c.zonas.map((z) => el('option', { value: z, textContent: z })));
      $('vg-zona').value = vg.zona;
    }
    renderKpis(c);
    renderTotais(c);
    renderTurnos(c);
    obterJson(`/api/analise/oficial?${escopoQs()}`)
      .then((/** @type {ResumoOficial} */ r) => { renderCobertura(c, r); renderOficial(r); })
      .catch(() => renderOficial(null));
  } catch (err) { falhou('g-turnos', err); }
  try {
    const n = vg.ufs.length ? vg.ufs.length : vg.disponiveis.length;
    vg.dados.ufsComp = n >= 2 ? await obterJson(`/api/analise/ufs-comparacao?ufs=${ufsQs}`) : null;
    renderUfs(vg.dados.ufsComp);
  } catch (err) { falhou('g-ufs', err); }
  try {
    vg.dados.hist = await obterJson(`/api/analise/distribuicao?ufs=${ufsQs}&metrica=mesario`);
    renderHist(/** @type {Distribuicao} */ (vg.dados.hist));
  } catch (err) { falhou('g-hist', err); }
  try {
    vg.dados.migracao = /** @type {Migracao} */ (await obterJson(`/api/analise/migracao?${escopoQs()}`));
    renderMigracao(vg.dados.migracao);
  } catch (err) { falhou('g-migracao', err); }
}

async function carregarDispersao() {
  if (!vg.dispUf || !vg.disponiveis.includes(vg.dispUf)) vg.dispUf = (vg.ufs.length === 1 ? vg.ufs[0] : vg.disponiveis[0]) ?? '';
  $('vg-disp-uf').replaceChildren(...vg.disponiveis.map((u) => el('option', { value: u, textContent: u.toUpperCase() })));
  $('vg-disp-uf').value = vg.dispUf;
  for (const b of document.querySelectorAll('[data-nivel]')) b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.nivel === vg.nivel));
  if (!vg.dispUf) { vg.dados.disp = null; return renderDispersao(null); }
  try {
    const d = /** @type {Dispersao} */ (await obterJson(`/api/analise/dispersao?uf=${vg.dispUf}&nivel=${vg.nivel}&candidato=${encodeURIComponent(vg.dispCand)}`));
    vg.dados.disp = d;
    $('vg-disp-cand').replaceChildren(...d.candidatos.map((n) => el('option', { value: String(n), textContent: nomeCompleto(n) })));
    $('vg-disp-cand').value = d.candidato == null ? '' : String(d.candidato);
    renderDispersao(d);
  } catch (err) { falhou('g-dispersao', err); }
}

// Carrega tudo; as cores dos candidatos saem da ordem de votos do 1º turno no Brasil coletado (fixas entre gráficos).
async function carregarVisao() {
  if (!temEcharts()) {
    $('vg-cobertura').textContent = 'Biblioteca de gráficos indisponível (vendor/echarts.min.js). Rode npm install.';
    return;
  }
  try {
    const ufs = /** @type {{ ufs: AnaliseUf[] }} */ (await obterJson('/api/analise/ufs')).ufs;
    vg.disponiveis = ufs.map((u) => u.uf);
    vg.assinatura = ufs.map((u) => `${u.uf}:${u.secoes}:${u.analisadoEm ?? ''}`).join('|');
    vg.ufs = vg.ufs.filter((u) => vg.disponiveis.includes(u));
    if (!vg.nomesCarregados) {
      vg.nomes = (await obterJson('/api/analise/candidatos').catch(() => ({ candidatos: {} }))).candidatos ?? {};
      vg.nomesCarregados = true;
    }
    const br = /** @type {Comparativo} */ (await obterJson('/api/analise/comparativo?escopo=brasil'));
    for (const t of br.turnos) for (const c of t.candidatos) corDe(c.numero);
  } catch (err) {
    $('vg-cobertura').textContent = `análise: ${/** @type {Error} */ (err).message}`;
    return;
  }
  renderEscopo();
  await Promise.all([carregarEscopo(), carregarMapa(), carregarDispersao()]);
}

// ---- sub-abas da Análise e eventos da visão geral ----
const visaoVisivel = () => !$('aba-analise').hidden && !$('sub-visao').hidden;
let visaoIniciada = false;
function aoMostrar() {
  if (!visaoVisivel()) return;
  if (!visaoIniciada) {
    visaoIniciada = true;
    carregarVisao();
  } else for (const g of graficos.values()) g.resize();
}
/** @param {string} s */
function trocarSubaba(s) {
  if (s !== 'ranking') s = 'visao';
  for (const b of document.querySelectorAll('[data-subaba]')) b.setAttribute('aria-selected', String(/** @type {HTMLElement} */ (b).dataset.subaba === s));
  $('sub-visao').hidden = s !== 'visao';
  $('sub-ranking').hidden = s !== 'ranking';
  try { localStorage.setItem('subaba', s); } catch { /* sem armazenamento */ }
  aoMostrar();
}
for (const b of document.querySelectorAll('[data-subaba]')) {
  b.addEventListener('click', () => trocarSubaba(/** @type {HTMLElement} */ (b).dataset.subaba ?? 'visao'));
}
window.addEventListener('hashchange', aoMostrar);

/** @param {() => void} f */
const recarregarEscopo = (f) => { f(); renderEscopo(); carregarEscopo(); };
$('vg-brasil').addEventListener('click', () => recarregarEscopo(() => { vg.ufs = []; vg.zona = ''; }));
$('vg-ufs').addEventListener('click', (ev) => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (ev.target).closest('[data-uf]'));
  const uf = b?.dataset.uf;
  if (!uf) return;
  recarregarEscopo(() => {
    vg.ufs = vg.ufs.includes(uf) ? vg.ufs.filter((u) => u !== uf) : [...vg.ufs, uf].sort();
    vg.zona = '';
  });
  if (vg.ufs.length === 1 && vg.dispUf !== vg.ufs[0]) { vg.dispUf = vg.ufs[0] ?? ''; vg.dispCand = ''; carregarDispersao(); }
});
$('vg-zona').addEventListener('change', () => recarregarEscopo(() => { vg.zona = $('vg-zona').value; }));
for (const b of document.querySelectorAll('[data-mapa-turno]')) {
  b.addEventListener('click', () => {
    vg.mapaTurno = Number(/** @type {HTMLElement} */ (b).dataset.mapaTurno);
    for (const o of document.querySelectorAll('[data-mapa-turno]')) o.setAttribute('aria-pressed', String(o === b));
    carregarMapa();
  });
}
for (const b of document.querySelectorAll('[data-ufs-turno]')) {
  b.addEventListener('click', () => {
    vg.ufsTurno = Number(/** @type {HTMLElement} */ (b).dataset.ufsTurno);
    for (const o of document.querySelectorAll('[data-ufs-turno]')) o.setAttribute('aria-pressed', String(o === b));
    renderUfs(vg.dados.ufsComp);
  });
}
for (const b of document.querySelectorAll('[data-turnos-un]')) {
  b.addEventListener('click', () => {
    vg.turnosUn = /** @type {HTMLElement} */ (b).dataset.turnosUn ?? 'pct';
    for (const o of document.querySelectorAll('[data-turnos-un]')) o.setAttribute('aria-pressed', String(o === b));
    if (vg.dados.comp) renderTurnos(vg.dados.comp);
  });
}
for (const b of document.querySelectorAll('[data-nivel]')) {
  b.addEventListener('click', () => { vg.nivel = /** @type {HTMLElement} */ (b).dataset.nivel ?? 'zona'; carregarDispersao(); });
}
$('vg-disp-uf').addEventListener('change', () => { vg.dispUf = $('vg-disp-uf').value; vg.dispCand = ''; carregarDispersao(); });
$('vg-disp-cand').addEventListener('change', () => { vg.dispCand = $('vg-disp-cand').value; carregarDispersao(); });


// Início automático (serviço do sistema): pergunta uma vez numa faixa no topo; depois, a opção fica na Configuração.
/** @param {{ iniciarAoLigar: boolean | null, servico: boolean }} p */
function mostrarPreferencias(p) {
  $('pergunta-servico').hidden = !(p.servico && p.iniciarAoLigar == null);
  $('cfg-iniciar-ao-ligar').checked = p.iniciarAoLigar === true;
  $('cfg-servico-dica').replaceChildren(p.servico
    ? 'Rodando agora como serviço do sistema. Salvo na hora, sem precisar de Aplicar.'
    : 'Vale quando o TSE Auditor está instalado como serviço (npm run servico -- instalar). Salvo na hora, sem precisar de Aplicar.');
}
/** @param {boolean} iniciarAoLigar */
async function salvarPreferencia(iniciarAoLigar) {
  try {
    mostrarPreferencias(await obterJson('/api/preferencias', {
      method: 'POST', headers: { 'x-tse-auditor': '1', 'content-type': 'application/json' }, body: JSON.stringify({ iniciarAoLigar }),
    }));
  } catch (err) {
    avisar(`preferência não salva: ${/** @type {Error} */ (err).message}`);
  }
}
for (const b of document.querySelectorAll('[data-iniciar-ao-ligar]')) {
  b.addEventListener('click', () => salvarPreferencia(/** @type {HTMLElement} */ (b).dataset.iniciarAoLigar === 'true'));
}
$('cfg-iniciar-ao-ligar').addEventListener('change', () => salvarPreferencia($('cfg-iniciar-ao-ligar').checked));
if (!SITE) obterJson('/api/preferencias').then(mostrarPreferencias, () => { /* painel antigo ou indisponível: sem a pergunta */ });

// Tema claro/escuro do sistema: redesenha com as novas cores.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redesenhar);

// UF extraída/analisada de novo: recarrega a visão geral quando estiver visível.
setInterval(() => {
  if (!visaoIniciada || !visaoVisivel()) return;
  const a = an.ufs.map((u) => `${u.uf}:${u.secoes}:${u.analisadoEm ?? ''}`).join('|');
  if (a && a !== vg.assinatura) carregarVisao();
}, 5000);

{
  let sub = 'visao';
  try { sub = localStorage.getItem('subaba') ?? 'visao'; } catch { /* sem armazenamento */ }
  trocarSubaba(sub);
}

// ---- publicação: pacote para o repositório público ----

/**
 * @typedef {{ estado: string, etapa: string, texto: string | null, percentual: number | null, nome: string, erro: string | null,
 *   passo?: number, passos?: number, inicio: string, etapaInicio?: string }} JobPublicacao
 * @typedef {{ nome: string, geradoEm: string | null, bytes: number, arquivos: number, sha256sums: string | null, ufs: number }} BuildPublicacao
 * @typedef {{ uf: string, coleta: string | null, extraida: boolean, analisada: boolean, analisadaEm: string | null }} ProntidaoUf
 * @typedef {{ pasta: string, job: JobPublicacao | null, builds: BuildPublicacao[], ufs: ProntidaoUf[] }} EstadoPublicacao
 */

/** Pronta = coleta concluída, extraída e analisada. @param {ProntidaoUf} u */
function estadoPublicacao(u) {
  const coletada = u.coleta === 'baixado' || u.coleta === 'baixado_com_erros';
  if (coletada && u.analisada) return { classe: 'est-analisada', texto: 'pronta' };
  if (u.analisada) return { classe: 'est-pronta', texto: u.coleta == null ? 'analisada, fora da coleta configurada' : 'analisada, coleta em andamento' };
  if (u.extraida) return { classe: 'est-pronta', texto: 'extraída, falta analisar' };
  if (coletada) return { classe: 'est-pronta', texto: 'coletada, falta extrair' };
  return { classe: 'est-aguardando', texto: 'coleta em andamento' };
}

/** @param {number} seg */
function fmtDuracao(seg) {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

// Etapa N de M, barra com percentual, item atual, tempo decorrido e estimativa do que falta na etapa
/** @param {JobPublicacao} j */
function progressoPublicacao(j) {
  const agora = Date.now();
  const naEtapa = (agora - Date.parse(j.etapaInicio ?? j.inicio)) / 1000;
  const p = j.percentual;
  const falta = p != null && p >= 0.02 && p < 1 ? `faltam ~${fmtDuracao((naEtapa / p) * (1 - p))} nesta etapa` : null;
  const titulo = `${j.passo ? `Etapa ${j.passo} de ${j.passos}: ` : ''}${j.etapa}${p != null ? ` · ${Math.floor(p * 100)}%` : ''}`;
  const detalhe = [j.texto, `${fmtDuracao((agora - Date.parse(j.inicio)) / 1000)} desde o início`, falta].filter(Boolean).join(' · ');
  return [el('strong', { textContent: titulo }), barraProgresso(p ?? 0, detalhe)];
}

async function atualizarPublicacao() {
  if ($('aba-publicacao').hidden) return;
  /** @type {EstadoPublicacao} */
  let p;
  try {
    p = await obterJson('/api/publicacao');
  } catch (err) {
    $('pub-job').textContent = `publicação: ${/** @type {Error} */ (err).message}`;
    return;
  }
  $('pub-pasta').textContent = p.pasta;
  const rodando = p.job?.estado === 'rodando';
  /** @type {HTMLButtonElement} */ ($('pub-gerar')).disabled = rodando;
  $('pub-cancelar').hidden = !rodando;
  const j = p.job;
  $('pub-job').replaceChildren(...(!j ? [] : rodando
    ? progressoPublicacao(j)
    : [el('span', { className: j.estado === 'erro' ? 'erro' : 'dica',
      textContent: j.estado === 'concluído' ? `pacote ${j.nome} pronto` : j.estado === 'cancelado' ? 'geração cancelada' : `erro: ${j.erro}` })]));
  const prontas = p.ufs.filter((u) => estadoPublicacao(u).texto === 'pronta').length;
  $('pub-resumo').textContent = `${prontas} de ${p.ufs.length} prontas`;
  $('pub-ufs').replaceChildren(...p.ufs.map((u) => {
    const e = estadoPublicacao(u);
    return el('div', { className: `pub-uf ${e.classe}` }, el('strong', { textContent: u.uf.toUpperCase() }), el('small', { textContent: e.texto }));
  }));
  $('pub-builds').replaceChildren(...(p.builds.length ? p.builds.map((b) => el('tr', {},
    el('td', {}, el('div', { textContent: b.nome }), el('div', { className: 'dica', textContent: b.geradoEm ? new Date(b.geradoEm).toLocaleString('pt-BR') : '' })),
    el('td', { className: 'num', textContent: String(b.ufs) }),
    el('td', { className: 'num', textContent: num(b.arquivos) }),
    el('td', { className: 'num', textContent: fmtBytes(b.bytes) }),
    el('td', {}, el('code', { textContent: b.sha256sums ?? '—' }))))
    : [el('tr', {}, el('td', { colSpan: 5, className: 'dica', textContent: 'nenhum pacote gerado ainda' }))]));
}

/** @param {string} acao */
async function acaoPublicacao(acao) {
  try {
    await obterJson(`/api/publicacao/${acao}`, { method: 'POST', headers: { 'x-tse-auditor': '1' } });
  } catch (err) {
    $('pub-job').textContent = `não foi possível ${acao === 'gerar' ? 'gerar' : 'cancelar'}: ${/** @type {Error} */ (err).message}`;
  }
  await atualizarPublicacao();
}
$('pub-gerar').addEventListener('click', () => acaoPublicacao('gerar'));
$('pub-cancelar').addEventListener('click', () => acaoPublicacao('cancelar'));
window.addEventListener('hashchange', () => { atualizarPublicacao(); });
if (!SITE) {
  setInterval(atualizarPublicacao, 3000);
  atualizarPublicacao();
}
