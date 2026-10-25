export interface FooterLink {
  href: string
  label: string
}

export interface FooterSection {
  title: string
  links: FooterLink[]
}

export interface FooterConfig {
  brand: {
    title: string
    description: string
  }
  sections: FooterSection[]
  copyright: string
}

export const footerConfig: FooterConfig = {
  brand: {
    title: "MCPPRO",
    description: "Model Context Protocol & frontier AI orchestration platform."
  },
  sections: [
    {
      title: "Platform",
      links: [
        { href: "/chat", label: "Chat Studio" },
        { href: "/api/models", label: "Model Catalog" },
        { href: "#", label: "MCP Tools" }
      ]
    },
    {
      title: "Models",
      links: [
        { href: "/chat", label: "Anthropic Claude 3.7" },
        { href: "/chat", label: "OpenAI GPT-4o & o3" },
        { href: "/chat", label: "Google Gemini 2.0" },
        { href: "/chat", label: "DeepSeek R1 / V3" }
      ]
    },
    {
      title: "Architecture",
      links: [
        { href: "#", label: "Model Context Protocol" },
        { href: "#", label: "Semantic Vector RAG" },
        { href: "#", label: "Agentic Streaming" },
        { href: "#", label: "BYOK Vault" }
      ]
    },
    {
      title: "Legal & Open Source",
      links: [
        { href: "https://github.com/Chiranth-Janardhan-moger/MCPPRO", label: "GitHub Repository" },
        { href: "#", label: "Privacy Policy" },
        { href: "#", label: "Terms of Service" },
        { href: "#", label: "Documentation" }
      ]
    }
  ],
  copyright: `© ${new Date().getFullYear()} MCPPRO. All rights reserved.`
}
