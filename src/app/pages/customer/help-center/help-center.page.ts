import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: 'rent' | 'payment' | 'terms' | 'trouble';
  open: boolean;
}

@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.page.html',
  styleUrls: ['./help-center.page.scss'],
  standalone: false
})
export class HelpCenterPage implements OnInit {
  searchQuery = '';
  activeCategory = 'all';

  isChatMode = false;
  chatInput = '';
  chatMessages: ChatMessage[] = [
    { role: 'model', content: 'Halo! Saya Asisten AI Roamie. Ada yang bisa saya bantu mengenai sewa mobil, pembayaran manual bank transfer, status verifikasi, atau bantuan darurat?' }
  ];
  isSending = false;

  faqs: FAQ[] = [
    {
      id: 1,
      question: 'Bagaimana cara menyewa mobil di Roamie?',
      answer: 'Cari mobil pilihan Anda di tab Beranda atau Katalog, tentukan tanggal mulai dan durasi sewa, lalu selesaikan pembayaran menggunakan Midtrans. Setelah pembayaran dikonfirmasi, Anda akan menerima detail lokasi pengambilan mobil.',
      category: 'rent',
      open: false
    },
    {
      id: 2,
      question: 'Apa saja syarat dokumen untuk sewa?',
      answer: 'Penyewa wajib mengunggah foto KTP dan SIM A yang masih berlaku saat memperbarui profil sebelum melakukan pemesanan sewa mobil.',
      category: 'terms',
      open: false
    },
    {
      id: 3,
      question: 'Bagaimana metode pembayaran yang tersedia?',
      answer: 'Pembayaran dilakukan secara aman melalui gateway Midtrans. Anda dapat memilih metode Transfer Bank (VA), Kartu Kredit, GOPAY, atau metode pembayaran lainnya.',
      category: 'payment',
      open: false
    },
    {
      id: 4,
      question: 'Apakah ada jaminan atau deposit sewa?',
      answer: 'Beberapa unit mobil premium memerlukan deposit jaminan yang akan dikembalikan secara penuh maksimal 24 jam setelah masa sewa berakhir jika kondisi mobil aman.',
      category: 'payment',
      open: false
    },
    {
      id: 5,
      question: 'Bagaimana jika terjadi kerusakan atau mogok di jalan?',
      answer: 'Hubungi layanan darurat 24 jam kami segera melalui tombol WhatsApp Support di halaman Bantuan ini. Tim teknis kami akan dikirimkan untuk membantu Anda di lokasi kejadian.',
      category: 'trouble',
      open: false
    },
    {
      id: 6,
      question: 'Apakah saya bisa membatalkan pesanan sewa?',
      answer: 'Pembatalan pesanan dapat dilakukan maksimal 24 jam sebelum tanggal mulai sewa untuk pengembalian dana 100%. Pembatalan kurang dari 24 jam akan dikenakan biaya administrasi.',
      category: 'terms',
      open: false
    }
  ];

  filteredFaqs: FAQ[] = [];

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.applyFilters();
    this.route.queryParams.subscribe(params => {
      if (params['chat'] === 'true') {
        this.enterChatMode();
      }
    });
  }

  toggleFaq(faq: FAQ) {
    faq.open = !faq.open;
  }

  selectCategory(category: string) {
    this.activeCategory = category;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredFaqs = this.faqs.filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            faq.answer.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = this.activeCategory === 'all' || faq.category === this.activeCategory;

      return matchesSearch && matchesCategory;
    });
  }

  handleSearch(event: any) {
    this.searchQuery = event.detail.value;
    this.applyFilters();
  }

  async contactChannel(channel: string) {
    let message = '';
    if (channel === 'whatsapp') {
      message = 'Menghubungkan ke WhatsApp CS Roamie...';
    } else if (channel === 'phone') {
      message = 'Memanggil Call Center Roamie (1500-ROAM)...';
    } else {
      message = 'Membuka aplikasi Email Support...';
    }

    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'primary',
      icon: 'chatbubble-ellipses-outline'
    });
    await toast.present();
  }

  enterChatMode() {
    this.isChatMode = true;
    this.scrollToBottom();
  }

  exitChatMode() {
    this.isChatMode = false;
  }

  sendMessage() {
    const text = this.chatInput.trim();
    if (!text || this.isSending) return;

    this.chatInput = '';
    this.isSending = true;

    // Tambahkan pesan user ke UI
    this.chatMessages.push({ role: 'user', content: text });
    this.scrollToBottom();

    // Kirim riwayat ke backend Laravel
    this.apiService.postData('chatbot', { messages: this.chatMessages }).subscribe({
      next: (res: any) => {
        this.isSending = false;
        if (res && res.success) {
          this.chatMessages.push({ role: 'model', content: res.reply });
        } else {
          this.chatMessages.push({ role: 'model', content: res.message || 'Maaf, terjadi kendala saat asisten memproses jawaban.' });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.isSending = false;
        console.error('Chatbot API error:', err);
        this.chatMessages.push({ role: 'model', content: 'Maaf, koneksi gagal. Pastikan Anda terhubung ke internet dan coba kembali.' });
        this.scrollToBottom();
      }
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chatMessagesContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 150);
  }

  goBack() {
    this.navCtrl.back();
  }
}
