
/*
  ARQUIVO: firebase.js

  OBJETIVO:
  Conectar o site Valeria Santos Beauty
  aos serviços do Firebase.
*/

// Importa a função responsável por iniciar o Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

// Importa a função que permite acessar o banco de dados Firestore.
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Importa a função responsável pela autenticação dos usuários.
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Configurações que identificam nosso projeto no Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBYJCMDIzOesQmXhcuy8cTMUQORcSyVgPk",
  authDomain: "projeto-beauty-842a8.firebaseapp.com",
  projectId: "projeto-beauty-842a8",
  storageBucket: "projeto-beauty-842a8.firebasestorage.app",
  messagingSenderId: "467189053971",
  appId: "1:467189053971:web:2d991e3bd7d11df810dde6"
};

// Inicializa o Firebase utilizando as configurações acima.
const app = initializeApp(firebaseConfig);

// Cria e exporta a conexão com o banco de dados Firestore.
// Será utilizada para salvar e consultar informações do site.
export const db = getFirestore(app);

// Cria e exporta a conexão com o sistema de autenticação.
// Será utilizada para controlar o acesso da área administrativa.
export const auth = getAuth(app);
