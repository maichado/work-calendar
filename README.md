# Folga

Página única para controlar a escala **um dia sim, um dia não**.

Hoje (20 de agosto de 2026) entra como **folga**. O ciclo continua a partir daí, inclusive fins de semana.

## Como usar

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (em geral `http://localhost:5173`).

- O destaque no topo é **hoje**: trabalho ou folga, e a contagem até o próximo evento.
- Clique em um dia no calendário para ver detalhes, anotar ou forçar trabalho/folga.
- Clique duplo no dia inverte o ciclo daquele dia (exceção).
- Em **Ajustes**: realinhar o ciclo, horário de expediente, tema, backup JSON.

Tudo fica salvo neste navegador (`localStorage`).
