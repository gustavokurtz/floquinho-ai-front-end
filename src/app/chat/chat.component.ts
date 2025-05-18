import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ChatService } from './chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-chat',
  imports: [MatCardModule, CommonModule, FormsModule],
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
        this.conversationArea.nativeElement.scrollTop = this.conversationArea.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  criarChat(message: string): void {
    if (!message || !message.trim()) return;

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

        // Adicionar resposta do bot
        this.botResponses.push({
          text: this.prompt.message || 'Desculpe, não entendi sua pergunta.',
          hasCode: this.detectCodeInResponse(this.prompt.message),
          code: this.extractCodeFromResponse(this.prompt.message),
          codeLanguage: this.detectLanguageFromResponse(this.prompt.message),
          timestamp: new Date()
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err);
        this.isLoading = false;

        // Adicionar mensagem de erro
        this.botResponses.push({
          text: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
          hasCode: false,
          timestamp: new Date()
        });
      }
    });

    // Se houver imagem, remover após o envio
    this.removeUploadedImage();
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

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }

  handleEnterKey(event: Event): void {
  const keyboardEvent = event as KeyboardEvent;
  if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
    keyboardEvent.preventDefault();
    this.criarChat(this.messageInput.nativeElement.value);
  }
}


  triggerImageUpload(): void {
    this.fileUpload.nativeElement.click();
  }

  handleImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeUploadedImage(): void {
    this.uploadedImage = null;
    if (this.fileUpload) {
      this.fileUpload.nativeElement.value = '';
    }
  }

  pasteFromClipboard(): void {
    navigator.clipboard.readText().then(
      clipText => {
        // Insere o texto copiado no campo de mensagem
        const currentText = this.messageInput.nativeElement.value;
        const cursorPos = this.messageInput.nativeElement.selectionStart;

        this.messageInput.nativeElement.value =
          currentText.slice(0, cursorPos) +
          clipText +
          currentText.slice(cursorPos);

        // Foco no campo após colar
        this.messageInput.nativeElement.focus();
      }
    ).catch(err => {
      console.error('Falha ao acessar a área de transferência:', err);
    });
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
}
