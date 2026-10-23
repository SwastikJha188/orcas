/**
 * Pad positions of the pyro machine drawings, as pure data for the server seed
 * (sensor x / y = pad as % of the drawing). Each machine's drawing is its
 * group's overview sheet of the diagram pack (line-sheets/art, F-0 … H-0).
 * GENERATED from those sheets by scripts/gen-pyro-layout.tsx — regenerate after moving a pad.
 */
export interface PyroLayout {
  /** Overview sheet the pads come from. */
  sheet: string;
  width: number;
  height: number;
  pads: Record<string, [number, number]>;
  windows: Record<string, [number, number, number, number]>;
}

export const PYRO_LAYOUT: Record<string, PyroLayout> = {
  "PYR-FED-01": {
    "sheet": "F-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "LEV-FSL-01": [
        834.5,
        286
      ],
      "POS-FSL-01": [
        820,
        553
      ],
      "POS-FSL-02": [
        845,
        553
      ],
      "POS-FSL-03": [
        870,
        553
      ],
      "POS-FSL-04": [
        894.6,
        553
      ],
      "POS-FSL-05": [
        919,
        553
      ],
      "POS-FSL-06": [
        944,
        553
      ],
      "STS-FSL-02": [
        615.7,
        492
      ],
      "STS-FSL-03": [
        574.3,
        594
      ],
      "ELE-FSL-01": [
        634,
        484.3
      ],
      "TMP-FSL-01": [
        648,
        494
      ],
      "PRS-FSL-01": [
        695.7,
        473
      ],
      "PRS-FSL-02": [
        908.6,
        290
      ],
      "ELE-FSL-02": [
        984.6,
        290
      ],
      "PRS-KFS-05": [
        919.4,
        587
      ],
      "ELE-KFS-03": [
        960.6,
        577.4
      ],
      "WGT-KFS-01": [
        835.3,
        643
      ],
      "WGT-KFS-02": [
        879.7,
        643
      ],
      "WGT-KFS-03": [
        922.8,
        643
      ],
      "POS-KFS-01": [
        858,
        675
      ],
      "POS-KFS-02": [
        901.6,
        675
      ],
      "PRS-KFS-01": [
        879.7,
        662
      ],
      "STS-KFS-01": [
        716.6,
        651.6
      ],
      "ELE-KFS-02": [
        735.6,
        644
      ],
      "FLO-KFS-01": [
        699,
        732
      ],
      "PRS-KFS-02": [
        739.6,
        719.6
      ],
      "FLO-KFS-02": [
        1072,
        732
      ],
      "PRS-KFS-06": [
        1028,
        720
      ],
      "PRS-KFS-04": [
        1250,
        747
      ],
      "LEV-KFS-04": [
        1295.5,
        761
      ],
      "LIM-KFS-01": [
        1376,
        426.5
      ],
      "TMP-KFS-01": [
        1290,
        366
      ],
      "VIB-KFS-01": [
        1290,
        336.7
      ],
      "ELE-KFS-01": [
        1148.7,
        328.7
      ],
      "SPD-KFS-01": [
        1406.7,
        337.7
      ],
      "TMP-KFS-02": [
        1162.7,
        363
      ]
    },
    "windows": {}
  },
  "PYR-PHC-01": {
    "sheet": "P-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "TMP-PHC-01": [
        660,
        254
      ],
      "PRS-PHC-01": [
        660,
        240
      ],
      "TMP-PHC-02": [
        641,
        309
      ],
      "PRS-PHC-02": [
        641,
        295
      ],
      "TMP-PHC-03": [
        660,
        364
      ],
      "PRS-PHC-03": [
        660,
        350
      ],
      "TMP-PHC-04": [
        641,
        419
      ],
      "PRS-PHC-04": [
        641,
        405
      ],
      "TMP-PHC-05": [
        660,
        474
      ],
      "PRS-PHC-05": [
        660,
        460
      ],
      "TMP-PHC-06": [
        641,
        522
      ],
      "PRS-PHC-06": [
        641,
        508
      ],
      "PRS-PHC-07": [
        567.5,
        420
      ],
      "PRS-PHC-08": [
        705.5,
        475
      ],
      "PRS-PHC-09": [
        567.5,
        530
      ],
      "TMP-PHC-07": [
        581,
        613.7
      ],
      "GAS-PHC-01": [
        807.2,
        235.1
      ],
      "GAS-PHC-02": [
        829.5,
        235.1
      ],
      "POS-PHC-01": [
        893.5,
        312
      ],
      "CAL-PHC-01": [
        756.5,
        206
      ],
      "VIB-PHC-02": [
        1006,
        323.2
      ],
      "TMP-PHC-10": [
        1006,
        342
      ],
      "VIB-PHC-01": [
        1044,
        323.2
      ],
      "TMP-PHC-09": [
        1044,
        342
      ],
      "ELE-PHC-01": [
        1128,
        301
      ],
      "SPD-PHC-01": [
        1172,
        333
      ],
      "TMP-PHC-11": [
        1135.7,
        343
      ],
      "TMP-PHC-08": [
        675.3,
        526
      ],
      "PRS-PHC-10": [
        659.7,
        526
      ],
      "GAS-PHC-03": [
        636.5,
        572
      ],
      "GAS-PHC-04": [
        660.5,
        572
      ],
      "POS-PHC-02": [
        734.7,
        502
      ],
      "POS-BRN-01": [
        845.7,
        576.3
      ],
      "TMP-BRN-03": [
        906.3,
        591.4
      ],
      "PRS-BRN-05": [
        881.4,
        591.4
      ],
      "FLO-BRN-02": [
        896.6,
        564
      ],
      "STS-BGH-01": [
        1251.3,
        216.3
      ],
      "TMP-BGH-02": [
        1150,
        238.2
      ],
      "PRS-BGH-02": [
        1093.6,
        238.2
      ],
      "PRS-BGH-01": [
        1428.5,
        316.7
      ],
      "LEV-BGH-01": [
        1234,
        486
      ],
      "ELE-BGH-02": [
        1233,
        526.5
      ],
      "GAS-BGH-01": [
        1454.3,
        470
      ],
      "VIB-BGH-01": [
        1375,
        607.7
      ],
      "TMP-BGH-01": [
        1375,
        623.3
      ],
      "ELE-BGH-01": [
        1416.7,
        592.3
      ],
      "SPD-BGH-01": [
        1442.3,
        613.3
      ],
      "TMP-BGH-03": [
        1417.3,
        621
      ]
    },
    "windows": {}
  },
  "PYR-KLN-01": {
    "sheet": "K-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "GAS-KLN-01": [
        578.5,
        345.5
      ],
      "GAS-KLN-02": [
        602.5,
        345.5
      ],
      "GAS-KLN-03": [
        626.5,
        345.5
      ],
      "STS-KLN-06": [
        545.5,
        445.5
      ],
      "TMP-KLN-13": [
        502,
        454
      ],
      "PRS-KLN-01": [
        502,
        546
      ],
      "CAL-KLN-06": [
        531,
        515
      ],
      "TMP-KLN-20": [
        1017.5,
        579
      ],
      "SPD-KLN-01": [
        813,
        546
      ],
      "TMP-KLN-21": [
        955,
        563
      ],
      "ELE-KLN-01": [
        971,
        534
      ],
      "VIB-KLN-01": [
        942.5,
        546
      ],
      "TMP-KLN-19": [
        942.5,
        579
      ],
      "STS-KLN-12": [
        1063,
        628.5
      ],
      "VIB-KLN-02": [
        905,
        543
      ],
      "TMP-KLN-22": [
        905,
        582
      ],
      "VIB-KLN-03": [
        869.7,
        543
      ],
      "TMP-KLN-23": [
        869.7,
        582
      ],
      "VIB-KLN-04": [
        798,
        555
      ],
      "STS-KLN-11": [
        825,
        597
      ],
      "LIM-KLN-01": [
        862.5,
        612
      ],
      "TMP-KLN-15": [
        869.7,
        670.5
      ],
      "LEV-KLN-01": [
        869.7,
        688
      ],
      "LAB-KLN-01": [
        860,
        695
      ],
      "PRS-KLN-05": [
        914,
        684
      ],
      "PRS-KLN-04": [
        899.5,
        670
      ],
      "FLO-KLN-05": [
        928.8,
        649.5
      ],
      "STS-KLN-05": [
        764,
        610
      ],
      "PRX-KLN-01": [
        730,
        638.5
      ],
      "PRX-KLN-02": [
        738.6,
        638.5
      ],
      "PRX-KLN-03": [
        747.2,
        638.5
      ],
      "PRX-KLN-04": [
        755.8,
        638.5
      ],
      "PRX-KLN-05": [
        764.4,
        638.5
      ],
      "PRX-KLN-06": [
        773,
        638.5
      ],
      "MIG-KLN-01": [
        643.5,
        458
      ],
      "TMP-KLN-28": [
        643.5,
        533.5
      ],
      "MIG-KLN-02": [
        1068.5,
        458
      ],
      "TMP-KLN-29": [
        1068.5,
        533.5
      ],
      "MIG-KLN-03": [
        1253,
        458
      ],
      "TMP-KLN-30": [
        1253,
        533.5
      ],
      "TMP-KLN-01": [
        617,
        546.5
      ],
      "TMP-KLN-02": [
        670,
        546.5
      ],
      "LEV-KLN-02": [
        643.5,
        547
      ],
      "TMP-KLN-03": [
        621.5,
        565.5
      ],
      "TMP-KLN-04": [
        674.5,
        565.5
      ],
      "LEV-KLN-03": [
        652,
        566
      ],
      "TMP-KLN-05": [
        1042,
        546.5
      ],
      "TMP-KLN-06": [
        1095,
        546.5
      ],
      "LEV-KLN-04": [
        1068.5,
        547
      ],
      "TMP-KLN-07": [
        1046.5,
        565.5
      ],
      "TMP-KLN-08": [
        1099.5,
        565.5
      ],
      "LEV-KLN-05": [
        1077,
        566
      ],
      "TMP-KLN-09": [
        1226.5,
        546.5
      ],
      "TMP-KLN-10": [
        1279.5,
        546.5
      ],
      "LEV-KLN-06": [
        1253,
        547
      ],
      "TMP-KLN-11": [
        1231,
        565.5
      ],
      "TMP-KLN-12": [
        1284,
        565.5
      ],
      "LEV-KLN-07": [
        1261.5,
        566
      ],
      "POS-KLN-01": [
        1087,
        534
      ],
      "POS-KLN-02": [
        1145,
        587
      ],
      "PRS-KLN-07": [
        1126.5,
        556.5
      ],
      "STS-KLN-08": [
        1180.5,
        626
      ],
      "STS-KLN-13": [
        1175,
        419
      ],
      "MAN-KLN-01": [
        1198.5,
        646
      ],
      "CAL-KLN-03": [
        979.5,
        465
      ],
      "TMP-KLN-25": [
        1323,
        555
      ],
      "TMP-KLN-26": [
        1323,
        453
      ],
      "TMP-KLN-14": [
        1378,
        371
      ],
      "TMP-KLN-27": [
        1400,
        419
      ],
      "PRS-KLN-03": [
        1400,
        458
      ]
    },
    "windows": {}
  },
  "PYR-BRN-01": {
    "sheet": "B-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "CAM-BRN-01": [
        589,
        279
      ],
      "PRS-BRN-03": [
        819,
        559
      ],
      "PRS-BRN-01": [
        868,
        491
      ],
      "PRS-BRN-02": [
        840,
        491
      ],
      "TMP-BRN-02": [
        590,
        618
      ],
      "VIB-BRN-01": [
        829,
        600
      ],
      "TMP-BRN-01": [
        806,
        638
      ],
      "ELE-BRN-01": [
        897,
        598
      ],
      "TMP-BRN-05": [
        883,
        620
      ],
      "LEV-BRN-01": [
        1194,
        260
      ],
      "TMP-BRN-04": [
        1135,
        368
      ],
      "GAS-BRN-01": [
        1300,
        328
      ],
      "FLO-BRN-01": [
        1173,
        513
      ],
      "CAL-BRN-01": [
        1173,
        541
      ],
      "PRS-BRN-04": [
        1003,
        580
      ],
      "VIB-BRN-02": [
        1272,
        604
      ],
      "ELE-BRN-02": [
        1328,
        603
      ],
      "TMP-BRN-06": [
        1316,
        618
      ]
    },
    "windows": {}
  },
  "PYR-CLR-01": {
    "sheet": "C-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "PRS-CLR-01": [
        456,
        515
      ],
      "TMP-CLR-11": [
        424,
        547
      ],
      "PRS-CLR-02": [
        575.2,
        515
      ],
      "TMP-CLR-12": [
        543.2,
        547
      ],
      "PRS-CLR-03": [
        694.4,
        515
      ],
      "TMP-CLR-13": [
        662.4,
        547
      ],
      "PRS-CLR-04": [
        813.6,
        515
      ],
      "TMP-CLR-14": [
        781.6,
        547
      ],
      "PRS-CLR-05": [
        932.8,
        515
      ],
      "TMP-CLR-15": [
        900.8,
        547
      ],
      "PRS-CLR-06": [
        1052,
        515
      ],
      "TMP-CLR-16": [
        1020,
        547
      ],
      "VIB-CLR-01": [
        409.5,
        618
      ],
      "TMP-CLR-01": [
        388,
        641
      ],
      "ELE-CLR-01": [
        450,
        618
      ],
      "TMP-CLR-17": [
        438,
        629
      ],
      "VIB-CLR-02": [
        528.7,
        618
      ],
      "TMP-CLR-02": [
        507.2,
        641
      ],
      "ELE-CLR-02": [
        569.2,
        618
      ],
      "TMP-CLR-18": [
        557.2,
        629
      ],
      "VIB-CLR-03": [
        647.9,
        618
      ],
      "TMP-CLR-03": [
        626.4,
        641
      ],
      "ELE-CLR-03": [
        688.4,
        618
      ],
      "TMP-CLR-19": [
        676.4,
        629
      ],
      "TMP-CLR-04": [
        745.6,
        641
      ],
      "ELE-CLR-04": [
        807.6,
        618
      ],
      "TMP-CLR-20": [
        795.6,
        629
      ],
      "TMP-CLR-05": [
        864.8,
        641
      ],
      "ELE-CLR-05": [
        926.8,
        618
      ],
      "TMP-CLR-21": [
        914.8,
        629
      ],
      "TMP-CLR-06": [
        984,
        641
      ],
      "ELE-CLR-06": [
        1046,
        618
      ],
      "TMP-CLR-22": [
        1034,
        629
      ],
      "SPD-CLR-01": [
        527,
        722
      ],
      "PRS-CLR-07": [
        430,
        729
      ],
      "TMP-CLR-07": [
        403.5,
        732.5
      ],
      "STS-CLR-01": [
        403.5,
        754
      ],
      "TMP-CLR-08": [
        1139,
        487
      ],
      "TMP-CLR-09": [
        689,
        354
      ],
      "VIB-CLR-07": [
        1033,
        288
      ],
      "TMP-CLR-10": [
        1060,
        325
      ],
      "ELE-CLR-07": [
        1117,
        290
      ],
      "TMP-CLR-23": [
        1106,
        313
      ]
    },
    "windows": {}
  },
  "PYR-CCT-01": {
    "sheet": "H-0",
    "width": 2000,
    "height": 1125,
    "pads": {
      "TMP-HMR-03": [
        213,
        538
      ],
      "ELE-HMR-01": [
        193,
        697
      ],
      "VIB-HMR-01": [
        353.6,
        542
      ],
      "TMP-HMR-01": [
        353.6,
        580
      ],
      "VIB-HMR-02": [
        564.5,
        542
      ],
      "TMP-HMR-02": [
        564.5,
        580
      ],
      "SPD-HMR-01": [
        617,
        562
      ],
      "SPD-CSL-01": [
        382.5,
        758.5
      ],
      "VIB-CSL-01": [
        1188,
        381
      ],
      "ELE-CSL-01": [
        923,
        381
      ],
      "TMP-CSL-02": [
        1074,
        352
      ],
      "LEV-CSL-01": [
        1539,
        504
      ],
      "PRS-CSL-01": [
        1535,
        470.5
      ],
      "ELE-CSL-02": [
        1659,
        521
      ]
    },
    "windows": {}
  }
};
