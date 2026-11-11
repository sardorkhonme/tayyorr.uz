class WalletTransactionModel {
  final String id;
  final String type; // TOPUP | SPEND | TRANSFER_IN | TRANSFER_OUT | PAYOUT | REFUND | HOLD | RELEASE | COMMISSION
  final String status; // PENDING | SUCCESS | FAILED | CANCELLED
  final int amount;
  final String method;
  final String? note;
  final bool reversed;
  final DateTime createdAt;

  const WalletTransactionModel({
    required this.id,
    required this.type,
    required this.status,
    required this.amount,
    required this.method,
    this.note,
    this.reversed = false,
    required this.createdAt,
  });

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) {
    return WalletTransactionModel(
      id: json['id'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      amount: (json['amount'] as num).toInt(),
      method: json['method'] as String,
      note: json['note'] as String?,
      reversed: json['reversed'] == true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class PayoutModel {
  final String id;
  final int amount;
  final String status;
  final String? adminNote;
  final DateTime createdAt;

  const PayoutModel({
    required this.id,
    required this.amount,
    required this.status,
    this.adminNote,
    required this.createdAt,
  });

  factory PayoutModel.fromJson(Map<String, dynamic> json) {
    return PayoutModel(
      id: json['id'] as String,
      amount: (json['amount'] as num).toInt(),
      status: json['status'] as String,
      adminNote: json['adminNote'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class WalletModel {
  final int balance;
  final int starBalance;
  final String walletCode;
  final List<WalletTransactionModel> transactions;
  final List<PayoutModel> payouts;

  const WalletModel({
    required this.balance,
    required this.starBalance,
    required this.walletCode,
    required this.transactions,
    required this.payouts,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      balance: (json['balance'] as num).toInt(),
      starBalance: (json['starBalance'] as num).toInt(),
      walletCode: json['walletCode'] as String,
      transactions: (json['transactions'] as List)
          .cast<Map<String, dynamic>>()
          .map(WalletTransactionModel.fromJson)
          .toList(),
      payouts: (json['payouts'] as List)
          .cast<Map<String, dynamic>>()
          .map(PayoutModel.fromJson)
          .toList(),
    );
  }
}

const kTxnTypeLabel = {
  'TOPUP': "Töldiriş",
  'SPEND': "Buyurtma tölovi",
  'TRANSFER_IN': "Kirim ötkazma",
  'TRANSFER_OUT': "Çiqim ötkazma",
  'PAYOUT': 'Kartaga yeçiş',
  'REFUND': 'Qaytariş',
  'HOLD': 'Şartnoma uçun bloklandi',
  'RELEASE': 'Iş haqi (yakunlangan)',
  'COMMISSION': 'Sayt komissiyasi',
};

const kOutflowTypes = {'SPEND', 'TRANSFER_OUT', 'PAYOUT', 'HOLD'};

const kPayoutStatusLabel = {
  'PENDING': 'Kartaga ötkazilmoqda',
  'PAID': "Ötkazildi",
  'REJECTED': 'Rad etildi (mablağ qaytarildi)',
  'CANCELLED': 'Bekor qilindi',
};
