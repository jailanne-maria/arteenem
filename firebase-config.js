/* ===== Firebase do ArteENEM =====
   Chaves públicas do app web — seguras para expor no front-end.
   A proteção dos dados é feita pelas regras do Firestore. */

const firebaseConfig = {
  apiKey: "AIzaSyDRaBwtkSkXnAC1IddJVSGbHjziDmx0pzs",
  authDomain: "arteenem-1691d.firebaseapp.com",
  projectId: "arteenem-1691d",
  storageBucket: "arteenem-1691d.firebasestorage.app",
  messagingSenderId: "939048251715",
  appId: "1:939048251715:web:bc11362b4ca73754903ff6",
  measurementId: "G-V8GDMHRQY2",
};

let _app = null;

// Chave pública de Web Push (Firebase Console > Configurações do projeto >
// Cloud Messaging > Certificados push da Web > gerar par de chaves).
// Cole a chave aqui para ativar as notificações push.
const VAPID_KEY = "";

function fb() {
  if (!_app) _app = firebase.initializeApp(firebaseConfig);
  return _app;
}

// ---------- Autenticação ----------
// Tenta popup; se o navegador bloquear (cookies de terceiros),
// cai para redirecionamento (mais confiável, sem popup).
function loginGoogle() {
  fb();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const auth = firebase.auth();
  return auth.signInWithPopup(provider).catch((e) => {
    const code = e && e.code;
    const usarRedirect =
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/web-storage-unsupported";
    if (usarRedirect) {
      return auth.signInWithRedirect(provider);
    }
    throw e;
  });
}

// Processa o retorno do redirecionamento (se usado)
function processarRedirect() {
  fb();
  return firebase.auth().getRedirectResult().catch(() => null);
}

function logout() {
  if (_app) return firebase.auth().signOut();
}

function aoMudarUsuario(callback) {
  fb();
  firebase.auth().onAuthStateChanged(callback);
}

function usuarioAtual() {
  if (!_app) return null;
  return firebase.auth().currentUser;
}

// ---------- Perfil do usuário ----------
function carregarUsuario(uid) {
  return firebase.firestore().collection("usuarios").doc(uid).get()
    .then((doc) => (doc.exists ? doc.data() : null))
    .catch(() => null);
}

function salvarUsuario(uid, dados) {
  return firebase.firestore().collection("usuarios").doc(uid)
    .set(dados, { merge: true });
}

// ---------- Turmas ----------
function gerarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return codigo;
}

function criarTurma(nome, professor) {
  const codigo = gerarCodigo();
  const turma = {
    nome,
    codigo,
    professorId: professor.uid,
    professorNome: professor.nome,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  };
  return firebase.firestore().collection("turmas").doc(codigo).set(turma)
    .then(() => turma);
}

function buscarTurma(codigo) {
  return firebase.firestore().collection("turmas").doc(codigo.toUpperCase()).get()
    .then((doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null));
}

// Renomear turma (somente o professor dono — garantido pelas regras)
function renomearTurma(codigo, novoNome) {
  return firebase.firestore().collection("turmas").doc(codigo)
    .update({ nome: novoNome });
}

function listarTurmasDoProfessor(uid) {
  return firebase.firestore().collection("turmas")
    .where("professorId", "==", uid)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function entrarNaTurma(codigo, aluno) {
  const cod = codigo.toUpperCase();
  return buscarTurma(cod).then((turma) => {
    if (!turma) throw new Error("Turma não encontrada. Confira o código.");
    return firebase.firestore()
      .collection("turmas").doc(cod).collection("membros").doc(aluno.uid)
      .set({
        nome: aluno.nome,
        email: aluno.email,
        entrouEm: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => turma);
  });
}

function listarMembros(codigo) {
  return firebase.firestore()
    .collection("turmas").doc(codigo).collection("membros")
    .get()
    .then((snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
}

// Remove um membro da turma (professor remove aluno, ou o próprio aluno sai)
function removerMembro(codigo, uid) {
  return firebase.firestore()
    .collection("turmas").doc(codigo).collection("membros").doc(uid)
    .delete();
}

function listarTurmasDoAluno(uid) {
  // Busca em todas as turmas os membros com este uid
  return firebase.firestore().collection("turmas").get().then(async (snap) => {
    const turmas = [];
    for (const doc of snap.docs) {
      const membro = await doc.ref.collection("membros").doc(uid).get();
      if (membro.exists) turmas.push({ id: doc.id, ...doc.data() });
    }
    return turmas;
  });
}

// Busca várias turmas pelos códigos (o aluno pode estar em mais de uma)
function listarTurmasPorCodigos(codigos) {
  const lista = (codigos || []).filter(Boolean).slice(0, 30);
  if (!lista.length) return Promise.resolve([]);
  return Promise.all(
    lista.map((c) => buscarTurma(c).catch(() => null))
  ).then((turmas) => turmas.filter(Boolean));
}

// Revisões de várias turmas de uma vez (array-contains-any aceita até 10)
function listarRevisoesDasTurmas(codigos) {
  const lista = (codigos || []).filter(Boolean).slice(0, 10);
  if (!lista.length) return Promise.resolve([]);
  return firebase.firestore().collection("revisoes")
    .where("turmas", "array-contains-any", lista)
    .get()
    .then((snap) => {
      const out = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      out.sort((a, b) => b.ms - a.ms);
      return out;
    });
}

// Atividades de várias turmas de uma vez
function listarAtividadesDasTurmas(codigos) {
  const lista = (codigos || []).filter(Boolean).slice(0, 10);
  if (!lista.length) return Promise.resolve([]);
  return firebase.firestore().collection("atividades")
    .where("turmas", "array-contains-any", lista)
    .get()
    .then((snap) => {
      const out = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadaEm && data.criadaEm.toMillis ? data.criadaEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      out.sort((a, b) => b.ms - a.ms);
      return out;
    });
}

// ---------- Resultados e ranking ----------
// Doc id: {codigoTurma}_{uid} — guarda o melhor resultado do aluno na turma
function salvarResultado(codigo, aluno, resultado) {
  const cod = codigo.toUpperCase();
  const id = `${cod}_${aluno.uid}`;
  const ref = firebase.firestore().collection("resultados").doc(id);
  return ref.get().then((doc) => {
    const anterior = doc.exists ? doc.data() : null;
    // Mantém o melhor percentual
    if (anterior && anterior.pct >= resultado.pct) {
      return ref.update({ atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    }
    return ref.set({
      uid: aluno.uid,
      nome: aluno.nome,
      foto: aluno.foto || "",
      turma: cod,
      pct: resultado.pct,
      acertos: resultado.acertos,
      total: resultado.total,
      areas: resultado.areas,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
}

function rankingDaTurma(codigo) {
  return firebase.firestore().collection("resultados")
    .where("turma", "==", codigo.toUpperCase())
    .get()
    .then((snap) => {
      const lista = snap.docs.map((d) => d.data());
      lista.sort((a, b) => b.pct - a.pct);
      return lista.map((d, i) => ({ posicao: i + 1, ...d }));
    });
}

// ---------- Mural de recados ----------
// turma = código da turma (mural da turma) ou null (mural coletivo)
function postarDepoimento(usuario, texto, turma) {
  return firebase.firestore().collection("depoimentos").add({
    uid: usuario.uid,
    nome: usuario.nome,
    foto: usuario.foto || "",
    texto: texto.trim(),
    turma: turma || null,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarDepoimentos(turma) {
  return firebase.firestore().collection("depoimentos")
    .where("turma", "==", turma || null)
    .get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function excluirDepoimento(id) {
  return firebase.firestore().collection("depoimentos").doc(id).delete();
}

// Fixar/desfixar recado (somente admin — garantido pelas regras do Firestore)
function fixarDepoimento(id, fixado) {
  return firebase.firestore().collection("depoimentos").doc(id)
    .update({ fixado: !!fixado });
}

// Curtir/descurtir um recado (qualquer pessoa logada)
function curtirDepoimento(id, uid, curtir) {
  const campo = firebase.firestore.FieldValue;
  return firebase.firestore().collection("depoimentos").doc(id)
    .update({
      curtidas: curtir ? campo.arrayUnion(uid) : campo.arrayRemove(uid),
    });
}

// ---------- Banco de perguntas (contribuição dos professores) ----------
function criarPergunta(professor, dados) {
  return firebase.firestore().collection("perguntas").add({
    ...dados,
    autorId: professor.uid,
    autorNome: professor.nome,
    criadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarPerguntas() {
  return firebase.firestore().collection("perguntas").get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function listarPerguntasDoProfessor(uid) {
  return firebase.firestore().collection("perguntas")
    .where("autorId", "==", uid)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function excluirPergunta(id) {
  return firebase.firestore().collection("perguntas").doc(id).delete();
}

// ---------- Duelos ----------
function criarDuelo(dados) {
  return firebase.firestore().collection("duelos").add({
    ...dados,
    status: "aguardando",
    respostas: {},
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function duelosPendentesPara(uid) {
  return firebase.firestore().collection("duelos")
    .where("oponenteId", "==", uid)
    .get()
    .then((snap) => snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.status !== "finalizado"));
}

function duelosDoUsuario(uid) {
  return firebase.firestore().collection("duelos")
    .where("criadorId", "==", uid)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function ouvirDuelo(dueloId, callback) {
  return firebase.firestore().collection("duelos").doc(dueloId)
    .onSnapshot((doc) => callback(doc.exists ? { id: doc.id, ...doc.data() } : null));
}

function salvarRespostaDuelo(dueloId, uid, respostas) {
  const ref = firebase.firestore().collection("duelos").doc(dueloId);
  return ref.update({ ["respostas." + uid]: respostas, status: "em_andamento" });
}

function finalizarDuelo(dueloId, vencedorId, placar) {
  return firebase.firestore().collection("duelos").doc(dueloId)
    .update({ status: "finalizado", vencedorId, placar });
}

// ---------- Revisões (professor publica para as turmas) ----------
function publicarRevisao(professor, dados) {
  return firebase.firestore().collection("revisoes").add({
    ...dados,
    professorId: professor.uid,
    professorNome: professor.nome,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarRevisoesDaTurma(codigo) {
  return firebase.firestore().collection("revisoes")
    .where("turmas", "array-contains", codigo)
    .get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function listarRevisoesDoProfessor(uid) {
  return firebase.firestore().collection("revisoes")
    .where("professorId", "==", uid)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function excluirRevisao(id) {
  return firebase.firestore().collection("revisoes").doc(id).delete();
}

// ---------- Respostas dos alunos nas atividades ----------
function salvarRespostaAtividade(revisaoId, aluno, turma, perguntaIndex, texto) {
  const id = `${revisaoId}_${aluno.uid}`;
  const ref = firebase.firestore().collection("respostasAtividade").doc(id);
  // Lê o que já existe, junta a nova resposta e salva (evita perder respostas anteriores)
  return ref.get().then((doc) => {
    const atual = doc.exists ? (doc.data().respostas || {}) : {};
    atual[perguntaIndex] = texto;
    return ref.set({
      revisaoId,
      alunoId: aluno.uid,
      alunoNome: aluno.nome,
      turma: turma || null,
      respostas: atual,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

function listarRespostasDaRevisao(revisaoId) {
  return firebase.firestore().collection("respostasAtividade")
    .where("revisaoId", "==", revisaoId)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function salvarComentarioAtividade(respostaId, perguntaIndex, comentario) {
  return firebase.firestore().collection("respostasAtividade").doc(respostaId)
    .set({ ["comentarios." + perguntaIndex]: comentario }, { merge: true });
}

function buscarMinhaResposta(revisaoId, alunoId) {
  return firebase.firestore().collection("respostasAtividade").doc(`${revisaoId}_${alunoId}`)
    .get()
    .then((d) => (d.exists ? d.data() : null));
}

// ---------- Atividades (professor cria e envia para as turmas) ----------
function criarAtividade(professor, dados) {
  return firebase.firestore().collection("atividades").add({
    ...dados,
    professorId: professor.uid,
    professorNome: professor.nome,
    criadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarAtividadesDaTurma(codigo) {
  return firebase.firestore().collection("atividades")
    .where("turmas", "array-contains", codigo)
    .get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadaEm && data.criadaEm.toMillis ? data.criadaEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function listarAtividadesDoProfessor(uid) {
  return firebase.firestore().collection("atividades")
    .where("professorId", "==", uid)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function excluirAtividade(id) {
  return firebase.firestore().collection("atividades").doc(id).delete();
}

// ---------- Respostas das atividades (auto-corrigidas) ----------
function salvarRespostaQuiz(atividadeId, aluno, turma, respostas, acertos, total, atividadeTitulo) {
  const id = `${atividadeId}_${aluno.uid}`;
  return firebase.firestore().collection("respostasQuiz").doc(id).set({
    atividadeId,
    atividadeTitulo: atividadeTitulo || "Atividade",
    alunoId: aluno.uid,
    alunoNome: aluno.nome,
    turma: turma || null,
    respostas,
    acertos,
    total,
    criadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarRespostasQuiz(atividadeId) {
  return firebase.firestore().collection("respostasQuiz")
    .where("atividadeId", "==", atividadeId)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function listarRespostasQuizDoAluno(alunoId) {
  return firebase.firestore().collection("respostasQuiz")
    .where("alunoId", "==", alunoId)
    .get()
    .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// ---------- Chat entre professores da mesma escola ----------
function enviarMensagemEscola(usuario, texto) {
  return firebase.firestore().collection("mensagens").add({
    escola: usuario.escola,
    uid: usuario.uid,
    nome: usuario.nome,
    foto: usuario.foto || "",
    texto: texto.trim(),
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function ouvirMensagensEscola(escola, callback) {
  return firebase.firestore().collection("mensagens")
    .where("escola", "==", escola)
    .onSnapshot((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => a.ms - b.ms);
      callback(lista);
    }, () => callback(null));
}

function excluirMensagemEscola(id) {
  return firebase.firestore().collection("mensagens").doc(id).delete();
}

// ---------- Chat da turma (professor + estudantes) ----------
function enviarMensagemTurma(usuario, turma, texto) {
  return firebase.firestore().collection("mensagensTurma").add({
    turma,
    uid: usuario.uid,
    nome: usuario.nome,
    foto: usuario.foto || "",
    papel: usuario.papel || "",
    texto: texto.trim(),
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function ouvirMensagensTurma(turma, callback) {
  return firebase.firestore().collection("mensagensTurma")
    .where("turma", "==", turma)
    .onSnapshot((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => a.ms - b.ms);
      callback(lista);
    }, () => callback(null));
}

function excluirMensagemTurma(id) {
  return firebase.firestore().collection("mensagensTurma").doc(id).delete();
}

// ---------- Feedback do professor nas atividades ----------
function salvarComentarioQuiz(atividadeId, alunoId, comentario) {
  const id = `${atividadeId}_${alunoId}`;
  return firebase.firestore().collection("respostasQuiz").doc(id)
    .set({ comentario: comentario || "", comentadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

// ---------- Administração / moderação ----------
function listarTodosUsuarios() {
  return firebase.firestore().collection("usuarios").get()
    .then((snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
}

function atualizarUsuarioAdmin(uid, dados) {
  return firebase.firestore().collection("usuarios").doc(uid).set(dados, { merge: true });
}

function excluirUsuarioAdmin(uid) {
  return firebase.firestore().collection("usuarios").doc(uid).delete();
}

function listarTodosDepoimentos() {
  return firebase.firestore().collection("depoimentos").get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function listarTodasMensagens() {
  return firebase.firestore().collection("mensagens").get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function listarTodasMensagensTurma() {
  return firebase.firestore().collection("mensagensTurma").get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

// ---------- Novidades (avisos para todos os usuários) ----------
function publicarNovidade(autor, dados) {
  return firebase.firestore().collection("novidades").add({
    titulo: (dados.titulo || "").trim(),
    texto: (dados.texto || "").trim(),
    link: (dados.link || "").trim(),
    autorId: autor.uid,
    autorNome: autor.nome,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function listarNovidades() {
  return firebase.firestore().collection("novidades").get()
    .then((snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.criadoEm && data.criadoEm.toMillis ? data.criadoEm.toMillis() : 0;
        return { id: d.id, ...data, ms };
      });
      lista.sort((a, b) => b.ms - a.ms);
      return lista;
    });
}

function excluirNovidade(id) {
  return firebase.firestore().collection("novidades").doc(id).delete();
}

// ---------- Notificações push (Firebase Cloud Messaging) ----------
function salvarTokenPush(uid, token) {
  const campo = firebase.firestore.FieldValue;
  return firebase.firestore().collection("usuarios").doc(uid)
    .set({ pushTokens: campo.arrayUnion(token), pushAtivo: true }, { merge: true });
}

function removerTokenPush(uid, token) {
  const campo = firebase.firestore.FieldValue;
  return firebase.firestore().collection("usuarios").doc(uid)
    .set({ pushTokens: campo.arrayRemove(token), pushAtivo: false }, { merge: true });
}

// Todos os tokens de push cadastrados (usado pelo script de envio)
function listarTokensPush() {
  return firebase.firestore().collection("usuarios").get()
    .then((snap) => {
      const tokens = [];
      snap.docs.forEach((d) => {
        const t = d.data().pushTokens;
        if (Array.isArray(t)) tokens.push(...t);
      });
      return [...new Set(tokens)];
    });
}

if (typeof module !== "undefined") {
  module.exports = { firebaseConfig };
}
