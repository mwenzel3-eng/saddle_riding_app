import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SaddleBridgeController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Local StoreKit bridge. Purchases are finished only after server verification.
import StoreKit

class SaddleBridgeController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SaddleStorePlugin())
    }
}

@objc(SaddleStorePlugin)
public class SaddleStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SaddleStorePlugin"
    public let jsName = "SaddleStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]
    private let productIDs: Set<String> = [
        "com.saddleschool.app.decor.heritage", "com.saddleschool.app.decor.crown",
        "com.saddleschool.app.avatar.dressage", "com.saddleschool.app.avatar.rosette",
        "com.saddleschool.app.avatar.hunter",
        "com.saddleschool.app.avatar.jumper",
        "com.saddleschool.app.avatar.classicaldressage",
        "com.saddleschool.app.avatar.crosscountry",
        "com.saddleschool.app.avatar.saddleseat",
        "com.saddleschool.app.avatar.westernpleasure",
        "com.saddleschool.app.avatar.reining",
        "com.saddleschool.app.avatar.barrel",
        "com.saddleschool.app.avatar.westerntrail",
        "com.saddleschool.app.avatar.arabianenglish",
        "com.saddleschool.app.avatar.arabianhunter",
        "com.saddleschool.app.avatar.arabiannative",
        "com.saddleschool.app.charm.heart", "com.saddleschool.app.charm.moon", "com.saddleschool.app.charm.horseshoe"
    ]

    @objc func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: productIDs)
                call.resolve(["products": products.filter { $0.type == .nonConsumable }.map { ["id": $0.id, "price": $0.displayPrice] }])
            } catch { call.reject("Could not load App Store products.", nil, error) }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productID = call.getString("productId"), productIDs.contains(productID),
              let accountString = call.getString("accountId"), let account = UUID(uuidString: accountString)
        else { call.reject("Invalid product or rider account."); return }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productID]).first, product.type == .nonConsumable else {
                    call.reject("This item is not available in the App Store yet."); return
                }
                switch try await product.purchase(options: [.appAccountToken(account)]) {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("Apple could not verify this purchase."); return
                    }
                    call.resolve(["id": String(transaction.id), "signedTransaction": verification.jwsRepresentation])
                case .pending: call.resolve(["pending": true])
                case .userCancelled: call.resolve(["cancelled": true])
                @unknown default: call.reject("Purchase status is unknown. Use Restore purchases later.")
                }
            } catch { call.reject("The purchase could not be completed.", nil, error) }
        }
    }
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()
                var transactions: [[String: String]] = []
                for await verification in Transaction.currentEntitlements {
                    if case .verified(let transaction) = verification, productIDs.contains(transaction.productID), transaction.revocationDate == nil {
                        transactions.append(["id": String(transaction.id), "signedTransaction": verification.jwsRepresentation])
                    }
                }
                call.resolve(["transactions": transactions])
            } catch { call.reject("Could not restore App Store purchases.", nil, error) }
        }
    }
    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing transaction."); return }
        Task { @MainActor in
            for await verification in Transaction.unfinished {
                if case .verified(let transaction) = verification, String(transaction.id) == id, productIDs.contains(transaction.productID) {
                    await transaction.finish()
                    call.resolve(); return
                }
            }
            call.resolve()
        }
    }
}
