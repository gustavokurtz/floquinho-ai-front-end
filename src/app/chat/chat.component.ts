import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ChatService } from './chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeHtmlPipe } from './safeHtml.pipe';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface BotResponse {
  text: string;
  hasCode: boolean;
  code?: string;
  codeLanguage?: string;
  timestamp: Date;
  textComplete: boolean; // Nova propriedade para controlar se o texto foi completamente digitado
}

@Component({
  selector: 'app-chat',
  imports: [MatCardModule, CommonModule, FormsModule, SafeHtmlPipe],
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('fileUpload') fileUpload!: ElementRef;
  @ViewChild('conversationArea') conversationArea!: ElementRef;

  readonly title = "Olá, Sou o Floquinho AI!🐶";
  prompt: any = { message: '' };

  userMessages: Message[] = [];
  botResponses: BotResponse[] = [];
  isLoading: boolean = false;
  uploadedImage: string | null = null;
  errorMessage: string | null = null;

  constructor(private service: ChatService) {}

  ngOnInit(): void {
    // Removido: this.checkSavedTheme();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
  try {
    if (this.conversationArea) {
      // Usar uma animação suave para o scroll
      this.conversationArea.nativeElement.scrollTo({
        top: this.conversationArea.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  } catch (err) { }
}

  criarChat(message: string): void {
    if (!message || !message.trim()) return;
    this.errorMessage = null;
    // Adiciona mensagem do usuário
    this.userMessages.push({
      content: message,
      isUser: true,
      timestamp: new Date()
    });
    // Limpar o campo de entrada
    if (this.messageInput) {
      this.messageInput.nativeElement.value = '';
    }
    // Mostrar indicador de carregamento
    this.isLoading = true;
    // Chamar serviço existente
    this.service.chat(message).subscribe({
      next: (data) => {
        this.prompt = data;
        this.typeBotResponse(this.prompt.message || 'Desculpe, não entendi sua pergunta.', this.prompt);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err);
        this.isLoading = false;
        this.errorMessage = 'Erro ao se comunicar com o servidor. Tente novamente mais tarde.';
        // Adicionar mensagem de erro na conversa
        this.botResponses.push({
          text: '❌ Erro: Não foi possível obter resposta do Floquinho. Tente novamente.',
          hasCode: false,
          timestamp: new Date(),
          textComplete: true
        });
      }
    });
  }

  typeBotResponse(fullText: string, prompt: any): void {
    let i = 0;
    const hasCode = this.detectCodeInResponse(fullText);
    const code = this.extractCodeFromResponse(fullText);
    // Remover código do texto principal se existir
    const textWithoutCode = hasCode ? fullText.replace(/```[\s\S]*?```/g, '') : fullText;
    const codeLanguage = this.detectLanguageFromResponse(fullText);

    // Processar formatação básica de Markdown para HTML
    let formattedText = textWithoutCode
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      // Listas com crase: - `texto`:
      .replace(/^-\s*`([^`]+)`:/gm, '<li><code>$1</code>:</li>')
      // Listas normais:
      .replace(/^-\s*(.*)/gm, '<li>$1</li>')
      // Negrito e itálico
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Quebra de linha
      .replace(/\n/g, '<br>');
    // Se houver <li>, envolver em <ul>
    if (/<li>/.test(formattedText)) {
      formattedText = formattedText.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
      // Remover <br> entre <ul> e <li>
      formattedText = formattedText.replace(/<ul><br>/g, '<ul>');
    }

    this.botResponses.push({
      text: '',
      hasCode,
      code,
      codeLanguage,
      timestamp: new Date(),
      textComplete: false
    });

    const idx = this.botResponses.length - 1;
    const typing = () => {
      if (i <= formattedText.length) {
        this.botResponses[idx].text = formattedText.slice(0, i);
        i++;
        setTimeout(typing, 8); // velocidade da digitação
      } else {
        // Marcar o texto como completo quando a digitação terminar
        this.botResponses[idx].textComplete = true;
      }
    };
    typing();
  }

  // Funções auxiliares para detectar e extrair código
  detectCodeInResponse(response: string): boolean {
    if (!response) return false;
    return response.includes('```') ||
           response.includes('code>') ||
           response.includes('pre>');
  }

  extractCodeFromResponse(response: string): string | undefined {
    if (!response) return undefined;

    // Extração simples, pode ser melhorada conforme necessário
    const codeRegex = /```(?:\w+)?\s*([\s\S]*?)```/;
    const match = response.match(codeRegex);

    return match ? match[1] : undefined;
  }

  detectLanguageFromResponse(response: string): string | undefined {
    if (!response) return undefined;

    // Detectar linguagem com base no texto
    const langRegex = /```(\w+)/;
    const match = response.match(langRegex);

    return match ? match[1] : 'code';
  }

  handleKeyDown(event: KeyboardEvent): void {
  // Se for Enter sem Shift, envie a mensagem
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    this.criarChat(this.messageInput.nativeElement.value);
  }
  // Se for Enter com Shift, permita quebra de linha normalmente
}

  autoResize(event: any): void {
  const textarea = event.target;
  // Guardar a posição atual de scroll
  const scrollPos = window.scrollY;

  // Salvar a altura atual
  const currentHeight = textarea.style.height;

  // Redimensionar o textarea
  textarea.style.height = 'auto';
  const newHeight = Math.max(58, textarea.scrollHeight); // Mínimo de 58px
  textarea.style.height = newHeight + 'px';

  // Evitar que a página role quando o textarea cresce
  window.scrollTo(0, scrollPos);
}

  handleEnterKey(event: Event): void {
  const keyboardEvent = event as KeyboardEvent;
  if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
    keyboardEvent.preventDefault();
    this.criarChat(this.messageInput.nativeElement.value);
  }
}

copyCode(code: string | undefined): void {
  if (!code) return;
  navigator.clipboard.writeText(code).then(
    () => {
      // Feedback visual de cópia bem-sucedida
      alert('Código copiado!');
    }
  ).catch(err => {
    console.error('Falha ao copiar o código:', err);
  });
}

getConversation() {
  const conversation = [];
  const max = Math.max(this.userMessages.length, this.botResponses.length);
  for (let i = 0; i < max; i++) {
    if (this.userMessages[i]) {
      conversation.push({
        ...this.userMessages[i],
        isUser: true
      });
    }
    if (this.botResponses[i]) {
      conversation.push({
        content: this.botResponses[i].text,
        code: this.botResponses[i].code,
        codeLanguage: this.botResponses[i].codeLanguage,
        isUser: false,
        textComplete: this.botResponses[i].textComplete
      });
    }
  }
  return conversation;
}
}