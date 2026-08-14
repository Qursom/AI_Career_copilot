import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { TypedConfigService } from '../../config/typed-config.service';

@Injectable()
export class ModelFactory {
  constructor(private readonly config: TypedConfigService) {}

  getChatModel(temperature = 0.1) {
    const provider = this.config.get('LLM_PROVIDER');
    if (provider === 'openai') return new ChatOpenAI({ apiKey: this.config.get('OPENAI_API_KEY'), model: this.config.get('OPENAI_MODEL'), temperature, maxRetries: 2 });
    if (provider === 'gemini') return new ChatGoogleGenerativeAI({ apiKey: this.config.get('GEMINI_API_KEY'), model: this.config.get('GEMINI_MODEL'), temperature, maxRetries: 2 });
    throw new Error('Mock provider is handled by the evaluation service test adapter. Configure LLM_PROVIDER=openai or gemini for LangChain execution.');
  }

  getEmbeddings() {
    return this.config.get('RAG_EMBEDDING_PROVIDER') === 'openai'
      ? new OpenAIEmbeddings({ apiKey: this.config.get('OPENAI_API_KEY'), model: this.config.get('OPENAI_EMBEDDING_MODEL') })
      : new GoogleGenerativeAIEmbeddings({ apiKey: this.config.get('GEMINI_API_KEY'), model: this.config.get('GEMINI_EMBEDDING_MODEL') });
  }
}
