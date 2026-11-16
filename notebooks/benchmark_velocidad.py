"""
Mide la velocidad de entrenamiento de cada modelo de la comparación en condiciones idénticas.

En Model_Comparison.ipynb el tiempo total de entrenamiento no es comparable porque el portátil
se suspendió durante la ejecución. Aquí se cronometran 30 pasos de entrenamiento (fase de fine-tuning,
lote de 64 imágenes de 224x224, mixed precision) y se estima el tiempo por época (438 lotes).

Ejecutar desde la carpeta notebooks/:
    ..\\.venv\\Scripts\\python.exe benchmark_velocidad.py
"""
import json, time
import torch
import torch.nn as nn
from torchvision import models

device = torch.device('cuda')
torch.backends.cudnn.benchmark = True
NUM_CLASSES, BATCH, PASOS, LOTES_POR_EPOCA = 3, 64, 30, 438


class CNNBaseline(nn.Module):
    # Misma CNN desde cero de Model_Comparison.ipynb
    def __init__(self, num_classes):
        super().__init__()
        def bloque(c_in, c_out):
            return nn.Sequential(nn.Conv2d(c_in, c_out, 3, padding=1), nn.BatchNorm2d(c_out), nn.ReLU(), nn.MaxPool2d(2))
        self.features = nn.Sequential(bloque(3, 32), bloque(32, 64), bloque(64, 128), bloque(128, 256))
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(nn.Dropout(0.5), nn.Linear(256, 256), nn.BatchNorm1d(256), nn.ReLU(),
                                        nn.Dropout(0.5), nn.Linear(256, num_classes))
    def forward(self, x):
        return self.classifier(torch.flatten(self.gap(self.features(x)), 1))


def preparar(nombre):
    """Devuelve el modelo con las mismas capas entrenables que en la fase de fine-tuning."""
    if nombre == 'CNN desde cero':
        return CNNBaseline(NUM_CLASSES)
    if nombre == 'MobileNetV3-Large':
        m = models.mobilenet_v3_large(weights=None)
        m.classifier[3] = nn.Linear(m.classifier[3].in_features, NUM_CLASSES)
        entrenables = [m.classifier] + list(m.features[-4:])
    elif nombre == 'ResNet-50':
        m = models.resnet50(weights=None)
        m.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(m.fc.in_features, NUM_CLASSES))
        entrenables = [m.fc, m.layer4]
    else:
        m = models.efficientnet_b0(weights=None)
        m.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(m.classifier[1].in_features, NUM_CLASSES))
        entrenables = [m.classifier] + list(m.features[-3:])
    for p in m.parameters():
        p.requires_grad = False
    for capa in entrenables:
        for p in capa.parameters():
            p.requires_grad = True
    return m


resultados = {}
x = torch.randn(BATCH, 3, 224, 224, device=device)
y = torch.randint(0, NUM_CLASSES, (BATCH,), device=device)
for nombre in ['CNN desde cero', 'MobileNetV3-Large', 'ResNet-50', 'EfficientNet-B0']:
    model = preparar(nombre).to(device).train()
    opt = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=1e-4)
    scaler = torch.amp.GradScaler('cuda')
    loss_fn = nn.CrossEntropyLoss()

    def paso():
        opt.zero_grad(set_to_none=True)
        with torch.autocast(device_type='cuda'):
            loss = loss_fn(model(x), y)
        scaler.scale(loss).backward()
        scaler.step(opt)
        scaler.update()

    for _ in range(5):          # calentamiento
        paso()
    torch.cuda.synchronize()
    t0 = time.perf_counter()
    for _ in range(PASOS):
        paso()
    torch.cuda.synchronize()
    seg_por_lote = (time.perf_counter() - t0) / PASOS
    resultados[nombre] = {'seg_por_lote': seg_por_lote, 'min_por_epoca': seg_por_lote * LOTES_POR_EPOCA / 60}
    print(f"{nombre:18s} {seg_por_lote * 1000:7.1f} ms/lote -> {resultados[nombre]['min_por_epoca']:.2f} min/época", flush=True)
    del model, opt
    torch.cuda.empty_cache()

with open('../resultados/velocidad_entrenamiento.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2)
