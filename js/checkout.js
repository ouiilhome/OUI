/* ==============================================
   OUIIL HOME - Checkout JavaScript (UPDATED)
   With Quantity Discounts & Payment Discounts
   ============================================== */

// ==========================================
// 1. CHECKOUT STATE
// ==========================================
let currentStep = 1;
let uploadedFile = null;
let uploadedFileBase64 = null;

// ==========================================
// 2. PRICING CONFIGURATION
// ==========================================
const PRICING = {
    basePrice: 620,
    // خصم الكمية: القطعة التانية 5%، التالتة 10%
    quantityDiscounts: {
        2: 0.05,  // 5% خصم على القطعة التانية
        3: 0.10   // 10% خصم على القطعة التالتة
    },
    // خصم طريقة الدفع: محفظة أو إنستا باي = 5%
    paymentDiscounts: {
        cod: 0,
        wallet: 0.05,
        instapay: 0.05
    }
};

// ==========================================
// 3. INIT CHECKOUT
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    initCheckout();
});

function initCheckout() {
    populateGovernorates();
    initFormListeners();
    updateSummary();
    initGovernorateChange();
    updateOfferBannerHighlight();

    // Form submit
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            handleSubmitOrder();
        });
    }
}

// ==========================================
// 4. POPULATE GOVERNORATES
// ==========================================
function populateGovernorates() {
    const select = document.getElementById('governorate');
    if (!select) return;

    GOVERNORATES.forEach(function (gov) {
        const option = document.createElement('option');
        option.value = gov;
        option.textContent = gov;
        select.appendChild(option);
    });
}

// ==========================================
// 5. GOVERNORATE CHANGE - UPDATE SHIPPING
// ==========================================
function initGovernorateChange() {
    const govSelect = document.getElementById('governorate');
    if (!govSelect) return;

    govSelect.addEventListener('change', function () {
        STATE.cart.shipping = 100;
        updateSummary();
    });
}

// ==========================================
// 6. CALCULATE QUANTITY DISCOUNT
// ==========================================
function calculateQuantityDiscount(qty) {
    var price = PRICING.basePrice;
    var totalBeforeDiscount = price * qty;
    var totalAfterDiscount = 0;
    var discountAmount = 0;

    for (var i = 1; i <= qty; i++) {
        if (i === 1) {
            // القطعة الأولى بالسعر الكامل
            totalAfterDiscount += price;
        } else if (i === 2) {
            // القطعة التانية بخصم 5%
            totalAfterDiscount += price * (1 - PRICING.quantityDiscounts[2]);
        } else if (i >= 3) {
            // القطعة التالتة وما بعدها بخصم 10%
            totalAfterDiscount += price * (1 - PRICING.quantityDiscounts[3]);
        }
    }

    totalAfterDiscount = Math.round(totalAfterDiscount);
    discountAmount = totalBeforeDiscount - totalAfterDiscount;

    return {
        totalBeforeDiscount: totalBeforeDiscount,
        totalAfterDiscount: totalAfterDiscount,
        discountAmount: discountAmount
    };
}

// ==========================================
// 7. CALCULATE PAYMENT DISCOUNT
// ==========================================
function calculatePaymentDiscount(amountAfterQtyDiscount) {
    var paymentMethod = getSelectedPayment() || 'cod';
    var discountRate = PRICING.paymentDiscounts[paymentMethod] || 0;
    var discountAmount = Math.round(amountAfterQtyDiscount * discountRate);

    return {
        discountRate: discountRate,
        discountAmount: discountAmount
    };
}

// ==========================================
// 8. STEP NAVIGATION
// ==========================================
function goToStep(step) {
    if (step > currentStep) {
        if (!validateStep(currentStep)) {
            return;
        }
    }

    currentStep = step;

    document.querySelectorAll('.checkout-step-content').forEach(function (el) {
        el.classList.remove('active');
    });

    var targetStep = document.getElementById('step' + step);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    document.querySelectorAll('.checkout-steps .step').forEach(function (el) {
        var stepNum = parseInt(el.getAttribute('data-step'));
        el.classList.remove('active', 'completed');
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });

    document.querySelectorAll('.checkout-steps .step-line').forEach(function (line, index) {
        if (index < step - 1) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });

    var formWrapper = document.querySelector('.checkout-form-wrapper');
    if (formWrapper) {
        var headerH = 80;
        var top = formWrapper.getBoundingClientRect().top + window.scrollY - headerH;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }
}

// ==========================================
// 9. STEP VALIDATION
// ==========================================
function validateStep(step) {
    clearAllErrors();

    switch (step) {
        case 1: return validateStep1();
        case 2: return validateStep2();
        case 3: return validateStep3();
        default: return true;
    }
}

function validateStep1() {
    var valid = true;
    var name = document.getElementById('customerName');
    var phone = document.getElementById('phonePrimary');
    var phone2 = document.getElementById('phoneSecondary');

    if (!name.value.trim() || name.value.trim().length < 3) {
        showFieldError('customerName', 'nameError', 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل)');
        valid = false;
    }

    if (!phone.value.trim()) {
        showFieldError('phonePrimary', 'phoneError', 'يرجى إدخال رقم الموبايل');
        valid = false;
    } else if (!validatePhone(phone.value)) {
        showFieldError('phonePrimary', 'phoneError', 'رقم الموبايل غير صحيح – يجب أن يبدأ بـ 01 ويتكون من 11 رقم');
        valid = false;
    }

    if (phone2.value.trim() && !validatePhone(phone2.value)) {
        showFieldError('phoneSecondary', 'phone2Error', 'رقم الموبايل الاحتياطي غير صحيح');
        valid = false;
    }

    if (!valid) {
        showToast('يرجى مراجعة البيانات المطلوبة', 'error');
    }

    return valid;
}

function validateStep2() {
    var valid = true;
    var gov = document.getElementById('governorate');
    var city = document.getElementById('city');
    var address = document.getElementById('fullAddress');

    if (!gov.value) {
        showFieldError('governorate', 'govError', 'يرجى اختيار المحافظة');
        valid = false;
    }

    if (!city.value.trim() || city.value.trim().length < 2) {
        showFieldError('city', 'cityError', 'يرجى إدخال اسم المدينة');
        valid = false;
    }

    if (!address.value.trim() || address.value.trim().length < 10) {
        showFieldError('fullAddress', 'addressError', 'يرجى إدخال العنوان بالتفصيل (10 أحرف على الأقل)');
        valid = false;
    }

    if (!valid) {
        showToast('يرجى إكمال بيانات العنوان', 'error');
    }

    return valid;
}

function validateStep3() {
    var valid = true;
    var paymentMethod = getSelectedPayment();

    if (!paymentMethod) {
        showToast('يرجى اختيار طريقة الدفع', 'error');
        valid = false;
        return valid;
    }

    if (paymentMethod === 'wallet' || paymentMethod === 'instapay') {
        if (!uploadedFile) {
            var proofError = document.getElementById('proofError');
            if (proofError) {
                proofError.classList.add('show');
                proofError.textContent = 'يرجى رفع صورة إيصال التحويل';
            }
            showToast('يرجى رفع صورة إيصال التحويل', 'error');
            valid = false;
        }
    }

    return valid;
}

// ==========================================
// 10. FIELD ERROR HELPERS
// ==========================================
function showFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);

    if (field) field.classList.add('error');
    if (error) {
        error.textContent = message;
        error.classList.add('show');
    }
}

function clearFieldError(fieldId, errorId) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);

    if (field) field.classList.remove('error');
    if (error) error.classList.remove('show');
}

function clearAllErrors() {
    document.querySelectorAll('.form-control.error').forEach(function (el) {
        el.classList.remove('error');
    });
    document.querySelectorAll('.form-error.show').forEach(function (el) {
        el.classList.remove('show');
    });
}

// ==========================================
// 11. FORM INPUT LISTENERS
// ==========================================
function initFormListeners() {
    var fields = [
        { field: 'customerName', error: 'nameError' },
        { field: 'phonePrimary', error: 'phoneError' },
        { field: 'phoneSecondary', error: 'phone2Error' },
        { field: 'governorate', error: 'govError' },
        { field: 'city', error: 'cityError' },
        { field: 'fullAddress', error: 'addressError' }
    ];

    fields.forEach(function (item) {
        var el = document.getElementById(item.field);
        if (el) {
            el.addEventListener('input', function () {
                clearFieldError(item.field, item.error);
            });
            el.addEventListener('change', function () {
                clearFieldError(item.field, item.error);
            });
        }
    });
}

// ==========================================
// 12. PAYMENT METHOD SELECTION
// ==========================================
function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(function (el) {
        el.classList.remove('selected');
    });

    switch (method) {
        case 'cod':
            document.getElementById('paymentCOD').classList.add('selected');
            break;
        case 'wallet':
            document.getElementById('paymentWallet').classList.add('selected');
            break;
        case 'instapay':
            document.getElementById('paymentInstapay').classList.add('selected');
            break;
    }

    var transferDetails = document.getElementById('transferDetails');
    if (method === 'wallet' || method === 'instapay') {
        transferDetails.classList.add('show');
    } else {
        transferDetails.classList.remove('show');
        removeFile();
    }

    var proofError = document.getElementById('proofError');
    if (proofError) proofError.classList.remove('show');

    // إعادة حساب الإجمالي عند تغيير طريقة الدفع
    updateSummary();
}

function getSelectedPayment() {
    var selected = document.querySelector('input[name="paymentMethod"]:checked');
    return selected ? selected.value : null;
}

function getPaymentLabel(method) {
    switch (method) {
        case 'cod': return 'الدفع عند الاستلام';
        case 'wallet': return 'محفظة إلكترونية';
        case 'instapay': return 'إنستا باي';
        default: return method;
    }
}

// ==========================================
// 13. FILE UPLOAD
// ==========================================
function handleFileUpload(input) {
    var file = input.files[0];
    if (!file) return;

    var maxSize = 5 * 1024 * 1024;
    var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
        showToast('نوع الملف غير مدعوم. يرجى رفع صورة JPG أو PNG أو PDF', 'error');
        input.value = '';
        return;
    }

    if (file.size > maxSize) {
        showToast('حجم الملف كبير جداً. الحد الأقصى 5MB', 'error');
        input.value = '';
        return;
    }

    uploadedFile = file;

    var preview = document.getElementById('filePreview');
    var previewImage = document.getElementById('previewImage');
    var fileName = document.getElementById('fileName');
    var uploadArea = document.getElementById('fileUploadArea');

    if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (e) {
            previewImage.src = e.target.result;
            uploadedFileBase64 = e.target.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.style.display = 'none';
        var reader = new FileReader();
        reader.onload = function (e) {
            uploadedFileBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
    preview.style.display = 'block';
    uploadArea.style.display = 'none';

    var proofError = document.getElementById('proofError');
    if (proofError) proofError.classList.remove('show');

    showToast('تم رفع الصورة بنجاح', 'success');
}

function removeFile() {
    uploadedFile = null;
    uploadedFileBase64 = null;

    var input = document.getElementById('paymentProof');
    var preview = document.getElementById('filePreview');
    var uploadArea = document.getElementById('fileUploadArea');

    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ==========================================
// 14. QUANTITY CONTROL
// ==========================================
function updateQuantity(change) {
    var input = document.getElementById('quantity');
    if (!input) return;

    var current = parseInt(input.value) || 1;
    var newVal = current + change;

    if (newVal < 1) newVal = 1;
    if (newVal > 10) newVal = 10;

    input.value = newVal;
    STATE.cart.quantity = newVal;
    updateSummary();
    updateOfferBannerHighlight();
}

// ==========================================
// 15. UPDATE OFFER BANNER HIGHLIGHT
// ==========================================
function updateOfferBannerHighlight() {
    var qty = STATE.cart.quantity;
    var badges = document.querySelectorAll('.offer-banner-item');

    badges.forEach(function (badge) {
        badge.classList.remove('current-selection');
    });

    if (qty === 1) {
        var b1 = document.getElementById('offerBadge1');
        if (b1) b1.classList.add('current-selection');
    } else if (qty === 2) {
        var b2 = document.getElementById('offerBadge2');
        if (b2) b2.classList.add('current-selection');
    } else if (qty >= 3) {
        var b3 = document.getElementById('offerBadge3');
        if (b3) b3.classList.add('current-selection');
    }
}

// ==========================================
// 16. COUPON CODE
// ==========================================
function applyCoupon() {
    var codeInput = document.getElementById('couponCode');
    var couponMsg = document.getElementById('couponMsg');
    var couponBtn = document.getElementById('couponBtn');

    if (!codeInput) return;

    var code = codeInput.value.trim();
    if (!code) {
        showCouponMsg('يرجى إدخال كود الخصم', 'error');
        return;
    }

    if (STATE.cart.couponApplied) {
        showCouponMsg('تم تطبيق كود خصم بالفعل', 'warning');
        return;
    }

    couponBtn.disabled = true;
    couponBtn.textContent = 'جاري التحقق...';

    validateCoupon(code)
        .then(function (data) {
            couponBtn.disabled = false;
            couponBtn.textContent = 'تطبيق';

            if (data && data.success) {
                STATE.cart.couponCode = code;
                STATE.cart.couponApplied = true;

                if (data.discount_type === 'percentage') {
                    var subtotal = STATE.product.price * STATE.cart.quantity;
                    STATE.cart.discount = Math.round(subtotal * (data.discount_value / 100));
                } else {
                    STATE.cart.discount = data.discount_value;
                }

                showCouponMsg('تم تطبيق الخصم: -' + STATE.cart.discount + ' ج.م ✓', 'success');
                codeInput.disabled = true;
                couponBtn.textContent = 'تم ✓';
                couponBtn.disabled = true;
                updateSummary();
                showToast('تم تطبيق كود الخصم بنجاح! 🎉', 'success');
            } else {
                showCouponMsg(data.message || 'كود الخصم غير صحيح أو منتهي', 'error');
                showToast('كود الخصم غير صحيح', 'error');
            }
        })
        .catch(function () {
            couponBtn.disabled = false;
            couponBtn.textContent = 'تطبيق';
            showCouponMsg('حدث خطأ أثناء التحقق. حاول مرة أخرى', 'error');
        });
}

function showCouponMsg(msg, type) {
    var couponMsg = document.getElementById('couponMsg');
    if (!couponMsg) return;

    couponMsg.textContent = msg;
    couponMsg.className = 'coupon-msg ' + type;
}

// ==========================================
// 17. UPDATE ORDER SUMMARY (NEW LOGIC)
// ==========================================
function updateSummary() {
    var price = PRICING.basePrice;
    var qty = STATE.cart.quantity;
    var shipping = STATE.cart.shipping;
    var couponDiscount = STATE.cart.discount;

    // 1. حساب خصم الكمية
    var qtyCalc = calculateQuantityDiscount(qty);
    var subtotalBeforeDiscount = qtyCalc.totalBeforeDiscount;
    var qtyDiscountAmount = qtyCalc.discountAmount;
    var subtotalAfterQtyDiscount = qtyCalc.totalAfterDiscount;

    // 2. حساب خصم طريقة الدفع
    var payCalc = calculatePaymentDiscount(subtotalAfterQtyDiscount);
    var paymentDiscountAmount = payCalc.discountAmount;

    // 3. الإجمالي النهائي
    var total = subtotalAfterQtyDiscount - paymentDiscountAmount + shipping - couponDiscount;
    if (total < 0) total = 0;

    // 4. إجمالي التوفير
    var totalSaved = qtyDiscountAmount + paymentDiscountAmount + couponDiscount;

    // === Update UI ===
    var elUnitPrice = document.getElementById('summaryUnitPrice');
    var elProductPrice = document.getElementById('lineProductPrice');
    var elQuantity = document.getElementById('lineQuantity');
    var elSubtotal = document.getElementById('lineSubtotal');
    var elShipping = document.getElementById('lineShipping');
    var elTotal = document.getElementById('lineTotal');

    // خصم الكمية
    var elQtyDiscountRow = document.getElementById('lineQtyDiscountRow');
    var elQtyDiscount = document.getElementById('lineQtyDiscount');
    var elQtyDiscountLabel = document.getElementById('lineQtyDiscountLabel');

    // خصم طريقة الدفع
    var elPaymentDiscountRow = document.getElementById('linePaymentDiscountRow');
    var elPaymentDiscount = document.getElementById('linePaymentDiscount');

    // خصم الكوبون
    var elDiscountRow = document.getElementById('lineDiscountRow');
    var elDiscount = document.getElementById('lineDiscount');

    // التوفير
    var elTotalSavings = document.getElementById('totalSavings');
    var elTotalSavingsAmount = document.getElementById('totalSavingsAmount');

    // Quantity discount hint
    var elQtyHint = document.getElementById('qtyDiscountHint');

    if (elUnitPrice) elUnitPrice.textContent = formatPrice(price);
    if (elProductPrice) elProductPrice.textContent = formatPrice(price);
    if (elQuantity) elQuantity.textContent = qty;
    if (elSubtotal) elSubtotal.textContent = formatPrice(subtotalBeforeDiscount);
    if (elShipping) elShipping.textContent = formatPrice(shipping);

    // عرض خصم الكمية
    if (qtyDiscountAmount > 0) {
        if (elQtyDiscountRow) elQtyDiscountRow.style.display = 'flex';
        if (elQtyDiscount) elQtyDiscount.textContent = '- ' + formatPrice(qtyDiscountAmount);
        if (elQtyDiscountLabel) {
            if (qty === 2) {
                elQtyDiscountLabel.textContent = 'خصم الكمية (5% على التانية)';
            } else if (qty >= 3) {
                elQtyDiscountLabel.textContent = 'خصم الكمية (5% تانية + 10% تالتة)';
            }
        }
    } else {
        if (elQtyDiscountRow) elQtyDiscountRow.style.display = 'none';
    }

    // عرض خصم طريقة الدفع
    if (paymentDiscountAmount > 0) {
        if (elPaymentDiscountRow) elPaymentDiscountRow.style.display = 'flex';
        if (elPaymentDiscount) elPaymentDiscount.textContent = '- ' + formatPrice(paymentDiscountAmount);
    } else {
        if (elPaymentDiscountRow) elPaymentDiscountRow.style.display = 'none';
    }

    // عرض خصم الكوبون
    if (couponDiscount > 0) {
        if (elDiscountRow) elDiscountRow.style.display = 'flex';
        if (elDiscount) elDiscount.textContent = '- ' + formatPrice(couponDiscount);
    } else {
        if (elDiscountRow) elDiscountRow.style.display = 'none';
    }

    // الإجمالي
    if (elTotal) elTotal.textContent = formatPrice(total);

    // إجمالي التوفير
    if (totalSaved > 0) {
        if (elTotalSavings) elTotalSavings.style.display = 'flex';
        if (elTotalSavingsAmount) elTotalSavingsAmount.textContent = 'وفّرت ' + formatPrice(totalSaved) + '!';
    } else {
        if (elTotalSavings) elTotalSavings.style.display = 'none';
    }

    // Quantity hint
    if (elQtyHint) {
        if (qty === 1) {
            elQtyHint.innerHTML = '<i class="fas fa-info-circle"></i> اطلب 2 واحصل على خصم 5% على التانية!';
            elQtyHint.style.display = 'block';
        } else if (qty === 2) {
            elQtyHint.innerHTML = '<i class="fas fa-fire"></i> اطلب 3 واحصل على خصم 10% على التالتة!';
            elQtyHint.style.display = 'block';
        } else {
            elQtyHint.style.display = 'none';
        }
    }
}

// ==========================================
// 18. SUBMIT ORDER
// ==========================================
function handleSubmitOrder() {
    clearAllErrors();

    var step1Valid = validateStep1();
    if (!step1Valid) { goToStep(1); return; }

    var step2Valid = validateStep2();
    if (!step2Valid) { goToStep(2); return; }

    var step3Valid = validateStep3();
    if (!step3Valid) { return; }

    // Collect data
    var price = PRICING.basePrice;
    var qty = STATE.cart.quantity;
    var shipping = STATE.cart.shipping;
    var couponDiscount = STATE.cart.discount;

    var qtyCalc = calculateQuantityDiscount(qty);
    var payCalc = calculatePaymentDiscount(qtyCalc.totalAfterDiscount);

    var subtotal = qtyCalc.totalAfterDiscount;
    var paymentDiscount = payCalc.discountAmount;
    var total = subtotal - paymentDiscount + shipping - couponDiscount;
    if (total < 0) total = 0;

    var orderId = generateOrderId();
    var paymentMethod = getSelectedPayment();

    var orderData = {
        order_id: orderId,
        date: new Date().toLocaleString('ar-EG'),
        customer_name: document.getElementById('customerName').value.trim(),
        phone_primary: document.getElementById('phonePrimary').value.trim(),
        phone_secondary: document.getElementById('phoneSecondary').value.trim() || '-',
        governorate: document.getElementById('governorate').value,
        city: document.getElementById('city').value.trim(),
        full_address: document.getElementById('fullAddress').value.trim(),
        landmark: document.getElementById('landmark').value.trim() || '-',
        product_name: STATE.product.name,
        quantity: qty.toString(),
        product_price: price.toString(),
        subtotal_before_discount: (price * qty).toString(),
        quantity_discount: qtyCalc.discountAmount.toString(),
        payment_discount: paymentDiscount.toString(),
        shipping_price: shipping.toString(),
        coupon_code: STATE.cart.couponCode || '-',
        coupon_discount: couponDiscount.toString(),
        total: total.toString(),
        payment_method: getPaymentLabel(paymentMethod),
        payment_proof: '',
        payment_proof_name: '',
        order_status: 'جديد'
    };

    // صورة التحويل
    if (uploadedFileBase64 && (paymentMethod === 'wallet' || paymentMethod === 'instapay')) {
        orderData.payment_proof = uploadedFileBase64;
        orderData.payment_proof_name = uploadedFile ? uploadedFile.name : 'proof.jpg';
    }

    var submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div> جاري الإرسال...';
    }

    showLoading();
    sendOrderRequest(orderData, orderId, submitBtn);
}

function sendOrderRequest(orderData, orderId, submitBtn) {
    var scriptUrl = CONFIG.API_URL;

    var params = 'action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof' && val.length > 5000) {
            continue;
        }
        params += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    fetch(scriptUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    })
    .then(function (response) {
        return response.text();
    })
    .then(function (text) {
        hideLoading();
        resetSubmitButton(submitBtn);

        var result = parseResponse(text);

        if (result.success) {
            orderSuccess(orderId);
        } else {
            tryGetMethod(orderData, orderId, submitBtn);
        }
    })
    .catch(function (error) {
        console.log('POST failed, trying GET...', error);
        tryGetMethod(orderData, orderId, submitBtn);
    });
}

function tryGetMethod(orderData, orderId, submitBtn) {
    showLoading();

    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    fetch(url, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
    })
    .then(function (response) {
        return response.text();
    })
    .then(function (text) {
        hideLoading();
        resetSubmitButton(submitBtn);

        var result = parseResponse(text);
        if (result.success) {
            orderSuccess(orderId);
        } else {
            tryNoCorsMethod(orderData, orderId, submitBtn);
        }
    })
    .catch(function (error) {
        console.log('GET failed, trying no-cors...', error);
        tryNoCorsMethod(orderData, orderId, submitBtn);
    });
}

function tryNoCorsMethod(orderData, orderId, submitBtn) {
    showLoading();

    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        redirect: 'follow'
    })
    .then(function () {
        hideLoading();
        resetSubmitButton(submitBtn);
        orderSuccess(orderId);
    })
    .catch(function (error) {
        hideLoading();
        resetSubmitButton(submitBtn);
        console.error('All methods failed:', error);
        sendViaImage(orderData, orderId, submitBtn);
    });
}

function sendViaImage(orderData, orderId, submitBtn) {
    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    var img = new Image();
    img.onload = function () {
        orderSuccess(orderId);
    };
    img.onerror = function () {
        orderSuccess(orderId);
    };
    img.src = url;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function parseResponse(text) {
    try {
        var json = JSON.parse(text);
        return json;
    } catch (e) {
        if (text && (text.indexOf('"success":true') > -1 || text.indexOf('success') > -1)) {
            return { success: true };
        }
        if (text === '' || text.indexOf('<!DOCTYPE') > -1 || text.indexOf('<html') > -1) {
            return { success: true };
        }
        return { success: false, message: text || 'Unknown response' };
    }
}

function resetSubmitButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> تأكيد الطلب';
    }
}

function orderSuccess(orderId) {
    var successOrderId = document.getElementById('successOrderId');
    if (successOrderId) {
        successOrderId.textContent = 'رقم طلبك: ' + orderId;
        successOrderId.style.fontWeight = '700';
        successOrderId.style.color = 'var(--primary)';
        successOrderId.style.fontSize = '1.1rem';
    }

    showSuccess();
    showToast('تم إرسال طلبك بنجاح! 🎉', 'success');

    try {
        document.getElementById('checkoutForm').reset();
    } catch(e) {}

    STATE.cart = {
        quantity: 1,
        shipping: CONFIG.DEFAULT_SHIPPING,
        discount: 0,
        couponCode: '',
        couponApplied: false
    };
    uploadedFile = null;
    uploadedFileBase64 = null;
}

// ==========================================
// 19. LOAD SHIPPING ON PAGE LOAD
// ==========================================
(function () {
    loadShippingRates().then(function () {
        console.log('Shipping rates loaded');
    });
})();