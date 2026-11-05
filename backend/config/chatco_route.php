<?php

/*
|--------------------------------------------------------------------------
| Legacy bootstrap route
|--------------------------------------------------------------------------
|
| This geometry is used only to create the first published route version
| during deployment. Runtime maps read the database-backed published version.
| Once an admin publishes a revision, this file no longer controls the map.
|
*/

return [
    'bootstrap_geometry' => [
        [14.925460996033356, 120.76512235423647], [14.92420402124189, 120.76528787872712],
        [14.920152600670095, 120.76571706129354], [14.915220582966443, 120.76619717003261],
        [14.901323759501945, 120.7719224852731], [14.886458903875173, 120.78596796657541],
        [14.874990764897628, 120.79618423260841], [14.87207763773181, 120.79878589058617],
        [14.865745283697539, 120.80435407290116], [14.860501402001871, 120.80901802051571],
        [14.85778433148678, 120.81163478600241], [14.855388331987022, 120.81368996254061],
        [14.852693386081329, 120.81600207219617], [14.851497406805521, 120.81765988586791],
        [14.849417900874624, 120.8235248577769], [14.845945790029823, 120.83422329239757],
        [14.844320234352493, 120.83905948176812], [14.842383282603786, 120.84506982184078],
        [14.841893283760905, 120.84698408093634], [14.840375174197046, 120.85413496987503],
        [14.839623777400517, 120.85750998638694], [14.838634008132473, 120.86201040680506],
        [14.8371385749864, 120.86297382674883], [14.83612807323988, 120.86333412418747],
        [14.835254069547146, 120.86366551171416], [14.833295288398967, 120.8661891975047],
        [14.8324975199314, 120.86740282879738], [14.831810284552892, 120.86868877790535],
        [14.83035944532852, 120.87094580599025], [14.828506904517909, 120.87400904071411],
        [14.828161518510791, 120.87659402671414], [14.828232464378223, 120.88095495481001],
        [14.828293590064265, 120.88426507598852], [14.828333307002257, 120.886565917288],
        [14.827864597760719, 120.89053477186802], [14.827464358080183, 120.89241460779954],
        [14.826703652032982, 120.89503763480697], [14.826129391774803, 120.89676317509107],
        [14.824720294651351, 120.89902058487867], [14.822990488146456, 120.90083394930517],
        [14.820845909007058, 120.90316146076532], [14.819825636767673, 120.90421208848784],
        [14.818163498638592, 120.90600984388941], [14.81713926187142, 120.90792339416925],
        [14.817003259236085, 120.90825980129833], [14.815860883789151, 120.90986972578348],
        [14.815234108397684, 120.91047524129526], [14.81440037604567, 120.91144161960287],
        [14.813099510668458, 120.91283614016609], [14.811588723108294, 120.91413585780512],
        [14.809543338082284, 120.9159455873501], [14.806525108118892, 120.91850689602882],
        [14.801946360221512, 120.92201682737273], [14.800215165075755, 120.9231979150914],
        [14.798804712598924, 120.92456195413324], [14.798451222604799, 120.92693781063585],
        [14.797677687963592, 120.92897276863408], [14.79630282892156, 120.92974647714638],
        [14.794082971006238, 120.9309174591896], [14.792193992873402, 120.9319309517239],
        [14.789984757130886, 120.93194351724061], [14.786542900321203, 120.93179853039794],
        [14.782758056853037, 120.93416554556896], [14.78116722012781, 120.93525425025881],
        [14.778139275650638, 120.93709526206992], [14.773104742636574, 120.93960422042926],
        [14.766525006702839, 120.94320546363049], [14.765525492192376, 120.94401383576125],
        [14.76072862621141, 120.94974045073359], [14.757057921030993, 120.95282600874056],
        [14.754092913022339, 120.95430633290394], [14.749614776242218, 120.95648776807238],
        [14.743004859115217, 120.95912082860627], [14.738243986091819, 120.96064278809952],
        [14.73118850798765, 120.96137476925526], [14.729202256905156, 120.96135109408412],
        [14.725646764905104, 120.9604838112117],
    ],

    /*
    | Fare points (main places) in route order, from the cooperative's fare
    | matrix. Each main place is one fare step; its sub places share its fare.
    | Read by DatabaseSeeder and the 2026_11_05 fare-point migration. Fares
    | are not listed here: they come from Settings > Financial Rules.
    */
    'fare_points' => [
        ['code' => 'CMLPT', 'name' => 'Calumpit', 'sub_stops' => ['Gatbuca', 'Crossing', 'Caltex']],
        ['code' => 'CI', 'name' => 'C.I. (Colegio de Calumpit)', 'sub_stops' => ['ASM']],
        ['code' => 'BAGBG', 'name' => 'Bagbag', 'sub_stops' => ['UPPC', 'Petron', 'Xebron', 'Phoenix']],
        ['code' => 'SMARC', 'name' => 'San Marcos', 'sub_stops' => ['PEO', 'Lares', 'Dream Oil']],
        ['code' => 'BORNE', 'name' => 'Borneo', 'sub_stops' => ['Gardenville', 'Metropolis', 'Lexber', 'McArthur']],
        ['code' => 'LONGS', 'name' => 'Longos', 'sub_stops' => ['MBB Royal', 'Vista', 'Walter', 'Heritage']],
        ['code' => 'CEU', 'name' => 'CEU', 'sub_stops' => ['South', 'Grand Royal']],
        ['code' => 'BLDRS', 'name' => 'Builders', 'sub_stops' => ['BPC', 'Alido', 'City Hall', 'Puregold']],
        ['code' => 'BSU', 'name' => 'BSU', 'sub_stops' => ['Xentromall', 'Graceland', 'Kapitolyo']],
        ['code' => 'CROML', 'name' => 'Crossing Malolos', 'sub_stops' => ['Pag-IBIG', 'Robinsons', 'Grand Town', 'Landbank']],
        ['code' => 'STIML', 'name' => 'S.T.I.', 'sub_stops' => ['Rapids', 'Gramman', 'Dakila']],
        ['code' => 'MARCL', 'name' => 'Marcelo', 'sub_stops' => ['Paradise', 'S&R', 'Madera']],
        ['code' => 'SNPBL', 'name' => 'San Pablo', 'sub_stops' => ['Ford', 'Stoplight', 'Kanto Maliit', 'Pastry']],
        ['code' => 'TIKAY', 'name' => 'Tikay', 'sub_stops' => ['DPWH', 'School', 'NFA', 'Industrial', 'Caltex', 'Jollibee']],
        ['code' => 'TABNG', 'name' => 'Tabang', 'sub_stops' => ['Eurobake', 'Tulay', 'Tawiran']],
        ['code' => 'TESDA', 'name' => 'TESDA', 'sub_stops' => ['Junkshop', 'LTO (Masagana)', 'Ajinomoto', 'Iral', 'Estrella', 'Mighty']],
        ['code' => 'ILANG', 'name' => 'Ilang-Ilang', 'sub_stops' => ['Aldea', 'Walter', 'Church', 'Munisipyo', 'Agatha Square']],
        ['code' => 'CRUZ', 'name' => 'Cruz', 'sub_stops' => ['Builders', 'Honda', 'Buslo', 'Unitop', 'Divimart']],
        ['code' => 'TUKTK', 'name' => 'Tuktukan', 'sub_stops' => ['Orovilla', 'Barangay Hall', 'Patubig', 'Russi', 'AFA', 'San Pablo Street', 'Wilcon']],
        ['code' => 'SAPRO', 'name' => 'SAPRO / STI', 'sub_stops' => ['Palmera', 'Pascual', 'Honda', 'Rocka']],
        ['code' => 'BALGT', 'name' => 'Balagtas', 'sub_stops' => ['Petron/Ultra', 'Meralco', 'Mariano', 'Palengke', 'Munisipyo', 'San Juan/Sabungan', 'Olma']],
        ['code' => 'GATE2', 'name' => 'Intercity (Gate 2)', 'sub_stops' => ['Galaxy', 'Gate 2']],
        ['code' => 'GATE1', 'name' => 'Intercity (Gate 1)', 'sub_stops' => ['Cruz sa Wawa', 'Gate 1', 'BDO', 'SSS', 'Golden Aub']],
        ['code' => 'WAKAS', 'name' => 'Wakas', 'sub_stops' => ['Yanga', 'Wakas Terminal', 'BPI', 'Metrobank', 'Palengke', 'Crossing']],
        ['code' => 'BINNG', 'name' => 'Binang', 'sub_stops' => ['Sto. Niño', 'Shell', 'Igolot', 'BDO', 'Puregold', 'Tawiran', 'JIL']],
        ['code' => 'BONLO', 'name' => 'Bonlo', 'sub_stops' => ['Barangay Hall', 'Petron', 'Joners', 'McDo']],
        ['code' => 'LOLMB', 'name' => 'Lolomboy', 'sub_stops' => ['Caltex', 'LTO', 'Specialist', 'Honda']],
        ['code' => 'TOYOT', 'name' => 'Toyota / Marilao', 'sub_stops' => ['Sabungan', 'Socorro', 'PDM', 'Decca', 'Dating Petron']],
        ['code' => 'CRMLA', 'name' => 'Crossing Marilao', 'sub_stops' => ['Ford', 'Tulay']],
        ['code' => 'SMMRL', 'name' => 'SM Marilao', 'sub_stops' => ['Saog', 'Lias', 'Nazareno', 'Medallion']],
        ['code' => 'PNDYN', 'name' => 'Pandayan', 'sub_stops' => ['C Fuel', '7-Eleven', 'Iglesia']],
        ['code' => 'MEYCA', 'name' => 'Meycauayan', 'sub_stops' => ['City Hall', 'Crossing', 'MC', 'Metrobank']],
        ['code' => 'BANGA', 'name' => 'Banga', 'sub_stops' => ['STI', 'Petron']],
    ],
];
