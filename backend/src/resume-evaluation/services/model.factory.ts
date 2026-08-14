import { Injectable } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatGoogle } from '@langchain/google';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TypedConfigService } from '../../config/typed-config.service';
import { LlmService } from '../../llm/llm.service';

class MockStructuredModel { constructor(private readonly llm: LlmService) {} withStructuredOutput(schema: any) { return { invoke: (prompt: string) => this.llm.generateStructured({ system: 'You are a deterministic test model. Return data matching the requested schema.', prompt, schema }) }; } }

@Injectable()
export class ModelFactory {
  constructor(private readonly config: TypedConfigService, private readonly llm: LlmService) {}
  getChatModel(temperature = 0.1): any {
    const provider=this.config.get('LLM_PROVIDER');
    if(provider==='openai') return new ChatOpenAI({apiKey:this.config.get('OPENAI_API_KEY'),model:this.config.get('OPENAI_MODEL'),temperature,maxRetries:2});
    if(provider==='gemini') return new ChatGoogle({apiKey:this.config.get('GEMINI_API_KEY'),model:this.config.get('GEMINI_MODEL'),temperature,maxRetries:2});
    return new MockStructuredModel(this.llm);
  }
  getEmbeddings() { return this.config.get('RAG_EMBEDDING_PROVIDER')==='openai' ? new OpenAIEmbeddings({apiKey:this.config.get('OPENAI_API_KEY'),model:this.config.get('OPENAI_EMBEDDING_MODEL')}) : new GoogleGenerativeAIEmbeddings({apiKey:this.config.get('GEMINI_API_KEY'),model:this.config.get('GEMINI_EMBEDDING_MODEL')}); }
}
