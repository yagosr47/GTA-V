import "./style.css";
import { Engine } from "./core/Engine";
const root = document.querySelector<HTMLElement>("#game")!;
try {
  new Engine(root);
} catch (error) {
  root.textContent =
    "Não foi possível iniciar a cidade. Verifique se a aceleração WebGL 2 está habilitada e recarregue a página.";
  console.error(error);
}
