# Nightfall City

Simulador urbano em terceira pessoa para navegadores com WebGL 2. A cidade de 64 quarteirões, os personagens, os veículos, a sinalização, as superfícies e o áudio são gerados localmente. Nenhum modelo, imagem, fonte ou som é carregado de um CDN.

## Executar

Requer Node.js 20 ou superior.

```sh
npm ci
npm run dev
```

`npm run build` verifica os tipos e produz um site estático em `dist/`. Sirva esse diretório via HTTP(S), não por `file://`.

## Jogar

Clique na cidade para capturar o mouse. Use **WASD** para andar, **Shift** para correr, **Espaço** para pular e **F** para entrar ou sair do veículo próximo. No veículo, **W/S** aceleram, freiam e dão ré, **A/D** esterçam e **Espaço** aciona o freio de mão. Use o botão direito para mirar, o esquerdo para disparar, **Q** ou a roda para alternar o equipamento e **R** para recarregar. **Esc** libera o cursor; **P** pausa a simulação.

Em telas táteis, jogue de preferência na horizontal. Arraste à esquerda para mover, à direita para olhar e sobre o botão de disparo para acompanhar a mira. O ícone de controle alterna o overlay. Tela cheia e orientação dependem da permissão do navegador.

Siga a rota âmbar do radar até o anel de início. Entrega, neutralização e corrida alternam a cada conclusão. Dinheiro e índice da próxima missão ficam no armazenamento local desta origem.

## Organização

- `src/core`: acumulador de passo fixo de 1/60 s, perfil gráfico, entrada e câmera.
- `src/world`: gerador com semente fixa, colisores, grafos de navegação e agrupamento das geometrias por material.
- `src/entities`: protagonista, articulações, veículos com quatro rodas por raycast e agentes de calçada.
- `src/systems`: armas, tráfego, alerta policial e missões.
- `src/ui`: telemetria, minimapa e controles multitoque.
- `src/utils`: materiais, texturas procedurais e síntese Web Audio.

A simulação usa passo fixo; não se pressupõe determinismo bit a bit entre implementações de navegador. O ajuste dinâmico de resolução reduz o custo gráfico, mas não garante 60 FPS em todo hardware.
