declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: {
      type?: string
      quality?: number
    }
    html2canvas?: {
      scale?: number
    }
    jsPDF?: {
      orientation?: 'portrait' | 'landscape'
      unit?: 'mm' | 'cm' | 'in'
      format?: string
    }
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(html: string | HTMLElement): Html2Pdf
    save(): void
    output(type: 'dataurlstring'): string
  }

  function html2pdf(): Html2Pdf

  export default html2pdf
}
