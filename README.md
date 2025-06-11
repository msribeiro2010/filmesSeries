# Filmes & Séries

Uma aplicação web moderna para descobrir filmes e séries populares, com informações sobre streaming e trailers.

## 🚀 Funcionalidades

- **Navegação por Categorias**: Filmes e séries populares
- **Filtros Avançados**: Por gênero, lançamentos, estreias e títulos em breve
- **Layout Responsivo**: Design moderno com scroll horizontal
- **Detalhes Completos**: Sinopse, avaliações, trailers e plataformas de streaming
- **Tema Escuro/Claro**: Interface adaptável
- **API TMDB**: Dados atualizados em tempo real

## 🛠️ Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Animações e layout responsivo
- **JavaScript ES6+**: Funcionalidades interativas
- **API TMDB**: Base de dados de filmes e séries
- **Font Awesome**: Ícones

## 📁 Estrutura do Projeto

```
filmes-series/
├── index.html                    # Página principal
├── script.js                     # Lógica principal da aplicação
├── style.css                     # Estilos base
├── horizontal-movie-cards.css    # Estilos para layout horizontal
├── horizontal-scroll-movies.js   # Funcionalidades de scroll horizontal
├── additional-styles.css         # Estilos adicionais (filtros, modal)
├── test-api.html                 # Página de teste da API
└── README.md                     # Documentação
```

## 🔧 Como Usar

### 1. Configuração Local

1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `index.html` em um navegador moderno
3. A aplicação carregará automaticamente os filmes populares

### 2. Teste da API

Para verificar se a API está funcionando corretamente:

1. Abra o arquivo `test-api.html` no navegador
2. Clique nos botões de teste para verificar a conectividade
3. Verifique o console do navegador para logs detalhados

### 3. Funcionalidades Principais

#### Navegação
- **Filmes**: Clique no botão "Filmes" para ver filmes populares
- **Séries**: Clique no botão "Séries" para ver séries populares
- **Filtros**: Use o dropdown de gêneros para filtrar por categoria

#### Categorias Especiais
- **Lançamentos**: Títulos lançados nos últimos 2 meses
- **Estreias**: Melhores avaliados da semana
- **Em Breve**: Próximos lançamentos

#### Interação com Cards
- **Clique no card**: Abre modal com detalhes completos
- **Botão play**: Abre modal focando no trailer
- **Scroll horizontal**: Use mouse wheel ou arraste para navegar

## 🔑 Configuração da API

A aplicação usa a API do The Movie Database (TMDB). A chave da API já está configurada no arquivo `script.js`:

```javascript
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
```

### Endpoints Utilizados

- **Filmes Populares**: `/movie/popular`
- **Séries Populares**: `/tv/popular`
- **Gêneros**: `/genre/{type}/list`
- **Descobrir**: `/discover/{type}`
- **Detalhes**: `/{type}/{id}`
- **Vídeos**: `/{type}/{id}/videos`
- **Streaming**: `/{type}/{id}/watch/providers`

## 🎨 Personalização

### Temas
A aplicação suporta tema claro e escuro. O botão de alternância está no cabeçalho.

### Estilos
- `style.css`: Estilos base e tema
- `horizontal-movie-cards.css`: Layout dos cards e animações
- `additional-styles.css`: Modal, filtros e componentes especiais

### Responsividade
- **Desktop**: Layout completo com scroll horizontal
- **Tablet**: Adaptação dos cards e filtros
- **Mobile**: Interface otimizada para toque

## 🐛 Solução de Problemas

### Cards não aparecem
1. Verifique o console do navegador (F12)
2. Teste a conectividade com `test-api.html`
3. Verifique se há bloqueios de CORS
4. Confirme que o JavaScript está habilitado

### Imagens não carregam
1. Verifique a conexão com `image.tmdb.org`
2. Confirme que a API está retornando `poster_path`
3. Verifique se há bloqueios de conteúdo

### Scroll horizontal não funciona
1. Confirme que `horizontal-scroll-movies.js` está carregado
2. Verifique se há erros no console
3. Teste em diferentes navegadores

## 📱 Compatibilidade

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🔄 Atualizações Futuras

- [ ] Sistema de favoritos
- [ ] Busca por texto
- [ ] Mais filtros avançados
- [ ] Cache offline
- [ ] PWA (Progressive Web App)

## 👨‍💻 Desenvolvedor

Desenvolvido por [Marcelo Ribeiro](https://github.com/msribeiro2010)

## 📄 Licença

Este projeto é de uso livre para fins educacionais e pessoais.

---

**Nota**: Esta aplicação utiliza a API do TMDB mas não é endossada ou certificada pelo TMDB.