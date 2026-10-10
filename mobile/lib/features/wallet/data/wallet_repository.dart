import '../../../core/network/api_client.dart';
import 'wallet_model.dart';

class WalletRepository {
  final _api = ApiClient.instance;

  Future<WalletModel> fetchWallet() async {
    final res = await _api.get('/mobile/wallet');
    return WalletModel.fromJson(res);
  }

  Future<String> topUp(int amount, {String? walletCode}) async {
    final res = await _api.post('/mobile/wallet/topup', data: {
      'amount': amount,
      if (walletCode != null && walletCode.isNotEmpty) 'walletCode': walletCode,
    });
    return res['payUrl'] as String;
  }

  Future<void> buyStars(int stars) async {
    await _api.post('/mobile/wallet/buy-stars', data: {'stars': stars});
  }

  Future<void> payout({required int amount, required String card, String? cardName}) async {
    await _api.post('/mobile/wallet/payout', data: {
      'amount': amount,
      'card': card,
      if (cardName != null && cardName.isNotEmpty) 'cardName': cardName,
    });
  }

  Future<void> cancelPayout(String id) async {
    await _api.post('/mobile/wallet/payout/$id/cancel');
  }
}
