import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9-eYhr2Bdadd4OWD17zIRszsz3LrxeBc",
  authDomain: "clube-da-caminhonete-be770.firebaseapp.com",
  projectId: "clube-da-caminhonete-be770",
  storageBucket: "clube-da-caminhonete-be770.firebasestorage.app",
  messagingSenderId: "559157035885",
  appId: "1:559157035885:web:dd265c86d0a3db6a6b9064",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAIL = "admin@clube.com";

const lista = document.getElementById("lista");
const resumo = document.getElementById("resumo");
const btnAtualizar = document.getElementById("btnAtualizar");
const btnSair = document.getElementById("btnSair");
const buscaInput = document.getElementById("busca");
const guard = document.getElementById("guard");

let dados = [];
let filtroAtual = "TODOS";
let itemExpandido = null;
let ordenacao = { campo: "data", asc: false };

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  const email = (user.email || "").trim().toLowerCase();

  if (email !== ADMIN_EMAIL) {
    await signOut(auth);
    window.location.href = "./login.html";
    return;
  }

  esconderGuard();
  await carregar();
});

btnAtualizar.addEventListener("click", carregar);

btnSair.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./login.html";
});

if (buscaInput) {
  buscaInput.addEventListener("input", render);
}

function esconderGuard() {
  guard?.classList.add("hidden");
}

async function carregar() {
  lista.innerHTML = `<div class="vazio">Atualizando painel...</div>`;

  const anunciosSnap = await getDocs(collection(db, "anuncios"));
  const eventosSnap = await getDocs(collection(db, "eventos"));

  dados = [
    ...anunciosSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      tipo: "ANÚNCIO",
      colecao: "anuncios",
    })),
    ...eventosSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      tipo: "EVENTO",
      colecao: "eventos",
    })),
  ];

  dados.sort((a, b) => obterTempo(b) - obterTempo(a));
  render();
}

function render() {
  renderResumo();

  let filtrados = dados.filter((item) => {
    const status = normalizarStatus(item.status);
    return filtroAtual === "TODOS" || status === filtroAtual;
  });

  filtrados = aplicarBusca(filtrados);
  filtrados = aplicarOrdenacao(filtrados);

  if (!filtrados.length) {
    lista.innerHTML = `<div class="vazio">Nenhum item encontrado.</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(card).join("");
}

function renderResumo() {
  resumo.innerHTML = `
    <button class="card-resumo TODOS ${filtroAtual === "TODOS" ? "ativo" : ""}" onclick="filtrarResumo('TODOS')">
      <span>Total</span>
      <strong>${dados.length}</strong>
    </button>

    <button class="card-resumo PENDENTE ${filtroAtual === "PENDENTE" ? "ativo" : ""}" onclick="filtrarResumo('PENDENTE')">
      <span>Pendentes</span>
      <strong>${contar("PENDENTE")}</strong>
    </button>

    <button class="card-resumo DEVOLVIDO ${filtroAtual === "DEVOLVIDO" ? "ativo" : ""}" onclick="filtrarResumo('DEVOLVIDO')">
      <span>Devolvidos</span>
      <strong>${contar("DEVOLVIDO")}</strong>
    </button>

    <button class="card-resumo ATIVO ${filtroAtual === "ATIVO" ? "ativo" : ""}" onclick="filtrarResumo('ATIVO')">
      <span>Ativos</span>
      <strong>${contar("ATIVO")}</strong>
    </button>

    <button class="card-resumo INATIVO ${filtroAtual === "INATIVO" ? "ativo" : ""}" onclick="filtrarResumo('INATIVO')">
      <span>Inativos</span>
      <strong>${contar("INATIVO")}</strong>
    </button>
  `;
}

window.filtrarResumo = function (status) {
  filtroAtual = status;
  itemExpandido = null;
  render();
};

window.ordenar = function (campo) {
  ordenacao.asc = ordenacao.campo === campo ? !ordenacao.asc : true;
  ordenacao.campo = campo;
  itemExpandido = null;
  render();
};

window.alternarDetalhe = function (id, colecao) {
  const chave = `${colecao}_${id}`;
  itemExpandido = itemExpandido === chave ? null : chave;
  render();
};

function contar(status) {
  return dados.filter((item) => normalizarStatus(item.status) === status).length;
}

function aplicarBusca(listaBase) {
  const termo = (buscaInput?.value || "").trim().toLowerCase();

  if (!termo) return listaBase;

  return listaBase.filter((item) => {
    const texto = [
      item.tipo,
      item.titulo,
      item.nome,
      item.descricao,
      item.descrição,
      item.detalhes,
      item.observacao,
      item.observação,
      item.texto,
      item.sobre,
      item.email,
      item.usuarioEmail,
      item.criadorEmail,
      item.vendedorEmail,
      item.userEmail,
      item.cidade,
      item.estado,
      item.status,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(termo);
  });
}

function aplicarOrdenacao(listaBase) {
  return [...listaBase].sort((a, b) => {
    let valA = obterValorOrdenacao(a, ordenacao.campo);
    let valB = obterValorOrdenacao(b, ordenacao.campo);

    if (ordenacao.campo === "data") {
      return ordenacao.asc ? valA - valB : valB - valA;
    }

    valA = String(valA || "").toLowerCase();
    valB = String(valB || "").toLowerCase();

    return ordenacao.asc
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });
}

function obterValorOrdenacao(item, campo) {
  if (campo === "tipo") return item.tipo || "";
  if (campo === "titulo") return item.titulo || item.nome || "";

  if (campo === "email") {
    return (
      item.email ||
      item.usuarioEmail ||
      item.criadorEmail ||
      item.vendedorEmail ||
      item.userEmail ||
      ""
    );
  }

  if (campo === "status") return normalizarStatus(item.status);
  if (campo === "data") return obterTempo(item);

  return "";
}

function card(item) {
  const status = normalizarStatus(item.status);
  const fotos = Array.isArray(item.fotos) ? item.fotos : [];
  const destaque = item.destaque === true;

  const titulo = escapar(item.titulo || item.nome || "Sem título");

  const descricao = escapar(
    item.descricao ||
    item.descrição ||
    item.detalhes ||
    item.observacao ||
    item.observação ||
    item.texto ||
    item.sobre ||
    ""
  );

  const email = escapar(
    item.email ||
    item.usuarioEmail ||
    item.criadorEmail ||
    item.vendedorEmail ||
    item.userEmail ||
    "Não informado"
  );

  const cidade = escapar(item.cidade || "");
  const estado = escapar(item.estado || "");

  const local =
    cidade || estado
      ? `${cidade}${cidade && estado ? " / " : ""}${estado}`
      : "";

  const data = formatarData(
    item.criadoEm ||
    item.createdAt ||
    item.atualizadoEm ||
    item.dataCriacao
  );

  const tipoClasse = item.tipo === "EVENTO" ? "evento" : "anuncio";
  const chave = `${item.colecao}_${item.id}`;
  const expandido = itemExpandido === chave;

  return `
    <article class="item ${expandido ? "expandido" : ""}">
      <div class="item-linha">
        <div>
          <span class="tipo ${tipoClasse}">${escapar(item.tipo)}</span>
        </div>

        <div class="titulo" onclick="alternarDetalhe('${item.id}', '${item.colecao}')">
          ${titulo}
          ${destaque ? `<span style="margin-left:6px;">⭐</span>` : ""}
        </div>

        <div class="descricao">${descricao}</div>

        <div class="usuario">${email}</div>

        <div class="local">${escapar(local)}</div>

        <div class="data">${data}</div>

        <div>
          <span class="status ${status}">${status}</span>
        </div>

        <div class="botoes">
          <button class="btn-aprovar" title="Aprovar" onclick="aprovar('${item.id}','${item.colecao}')">✓</button>

          <button class="btn-devolver" title="Devolver" onclick="devolver('${item.id}','${item.colecao}')">↩</button>

          <button class="btn-inativar" title="Inativar" onclick="inativar('${item.id}','${item.colecao}')">−</button>

          ${
            item.colecao === "anuncios"
              ? `
            <button
              class="${destaque ? "btn-inativar" : "btn-aprovar"}"
              title="${destaque ? "Remover destaque" : "Destacar"}"
              onclick="alternarDestaque('${item.id}', ${destaque})"
            >
              ${destaque ? "☆" : "⭐"}
            </button>
          `
              : ""
          }
        </div>

        <div class="fotos">
          ${fotos.map((foto) => `<img src="${escapar(foto)}" alt="Foto" />`).join("")}
        </div>
      </div>

      ${expandido ? detalheExpandido(item) : ""}
    </article>
  `;
}

function detalheExpandido(item) {
  const fotos = Array.isArray(item.fotos) ? item.fotos : [];

  const descricao = escapar(
    item.descricao ||
    item.descrição ||
    item.detalhes ||
    item.observacao ||
    item.observação ||
    item.texto ||
    item.sobre ||
    "Sem descrição."
  );

  const titulo = escapar(item.titulo || item.nome || "Sem título");

  const email = escapar(
    item.email ||
    item.usuarioEmail ||
    item.criadorEmail ||
    item.vendedorEmail ||
    item.userEmail ||
    "Não informado"
  );

  const telefone = escapar(item.telefone || item.whatsapp || "Não informado");
  const marca = escapar(item.marca || "Não informado");
  const modelo = escapar(item.modelo || "Não informado");
  const ano = escapar(item.ano || item.anoFabricacao || "Não informado");
  const preco = escapar(item.preco || item.valor || "Não informado");
  const cidade = escapar(item.cidade || "");
  const estado = escapar(item.estado || "");
  const local = cidade || estado ? `${cidade}${cidade && estado ? " / " : ""}${estado}` : "Não informado";
  const status = normalizarStatus(item.status);
  const destaque = item.destaque === true ? "SIM" : "NÃO";

  const motivoDevolucao = escapar(item.motivoDevolucao || "");
  const motivoInativacao = escapar(item.motivoInativacao || "");

  return `
    <div class="detalhe-expandido">
      <div class="detalhe-grid">
        <div class="detalhe-campo"><span>Título</span><strong>${titulo}</strong></div>
        <div class="detalhe-campo"><span>Status</span><strong>${status}</strong></div>
        <div class="detalhe-campo"><span>Destaque</span><strong>${destaque}</strong></div>
        <div class="detalhe-campo"><span>Usuário</span><strong>${email}</strong></div>
        <div class="detalhe-campo"><span>Telefone</span><strong>${telefone}</strong></div>
        <div class="detalhe-campo"><span>Marca</span><strong>${marca}</strong></div>
        <div class="detalhe-campo"><span>Modelo</span><strong>${modelo}</strong></div>
        <div class="detalhe-campo"><span>Ano</span><strong>${ano}</strong></div>
        <div class="detalhe-campo"><span>Preço</span><strong>${preco}</strong></div>
        <div class="detalhe-campo"><span>Local</span><strong>${local}</strong></div>
        <div class="detalhe-campo"><span>Coleção</span><strong>${escapar(item.colecao)}</strong></div>
        <div class="detalhe-campo"><span>ID</span><strong>${escapar(item.id)}</strong></div>
        <div class="detalhe-campo"><span>Fotos</span><strong>${fotos.length}</strong></div>
      </div>

      <div class="detalhe-descricao">${descricao}</div>

      ${
        motivoDevolucao
          ? `<div class="detalhe-descricao"><strong>Motivo da devolução:</strong><br>${motivoDevolucao}</div>`
          : ""
      }

      ${
        motivoInativacao
          ? `<div class="detalhe-descricao"><strong>Motivo da inativação:</strong><br>${motivoInativacao}</div>`
          : ""
      }

      <div class="detalhe-fotos">
        ${fotos.map((foto) => `<img src="${escapar(foto)}" alt="Foto" />`).join("")}
      </div>
    </div>
  `;
}

window.aprovar = async function (id, colecao) {
  await updateDoc(doc(db, colecao, id), {
    status: "ATIVO",
    motivoDevolucao: "",
    motivoInativacao: "",
  });

  await carregar();
};

window.devolver = async function (id, colecao) {
  const motivo = prompt("Informe o motivo da devolução:");

  if (!motivo || !motivo.trim()) {
    alert("O motivo da devolução é obrigatório.");
    return;
  }

  await updateDoc(doc(db, colecao, id), {
    status: "DEVOLVIDO",
    motivoDevolucao: motivo.trim(),
  });

  await carregar();
};

window.inativar = async function (id, colecao) {
  const motivo = prompt("Motivo da inativação:");

  await updateDoc(doc(db, colecao, id), {
    status: "INATIVO",
    motivoInativacao: motivo?.trim() || "Inativado pelo administrador",
  });

  await carregar();
};

window.alternarDestaque = async function (id, destaqueAtual) {
  await updateDoc(doc(db, "anuncios", id), {
    destaque: !destaqueAtual,
  });

  await carregar();
};

function normalizarStatus(status) {
  const s = String(status || "PENDENTE").trim().toUpperCase();

  if (s === "RECUSADO") return "DEVOLVIDO";
  if (s === "APROVADO") return "ATIVO";
  if (s === "EXCLUIDO") return "INATIVO";

  return s;
}

function obterTempo(item) {
  const data =
    item.criadoEm ||
    item.createdAt ||
    item.atualizadoEm ||
    item.dataCriacao;

  if (data?.seconds) return data.seconds * 1000;

  const tentativa = new Date(data);

  return isNaN(tentativa.getTime()) ? 0 : tentativa.getTime();
}

function formatarData(data) {
  if (!data) return "";

  const d = data.seconds ? new Date(data.seconds * 1000) : new Date(data);

  if (isNaN(d.getTime())) return "";

  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// admin-volante-destaques-2026
