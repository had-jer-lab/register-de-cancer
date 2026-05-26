import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatisticsEditor from './Statistics';
import CustomFieldsPage from './CustomFieldsPage'; // ← كيفاش سميتي الملف

// ─── API Helper ───────────────────────────────────────────────────────────────
import API_BASE from '../utils/apiConfig';

const API = `${API_BASE}/auth`;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

// ─── Wilayas & Communes ───────────────────────────────────────────────────────
const WILAYAS_COMMUNES = {
  'Adrar':['Timekten','Bouda','Ouled Ahmed Timmi','Adrar','Fenoughil','In Zghmir','Reggane','Sali','Sebaa','Tsabit','Tamest','Tamantit','Tit','Zaouiet Kounta','Akabli','Aoulef'],
  'Chlef':['Talassa','Zeboudja','El Hadjadj','Ouled Ben Abdelkader','Ain Merane','Breira','Ouled Abbes','Oued Fodda','Beni Rached','Herenfa','Tadjena','El Marsa','Chlef','Oum Drou','Sendjas','Sidi Abderrahmane','Sidi Akkacha','Tenes','Beni  Bouattab','El Karimia','Harchoun','Bouzeghaia','Taougrit','Beni Haoua','Abou El Hassane','Oued Goussine','Chettia','Moussadek','Ouled Fares','Boukadir','Oued Sly','Sobha','Benairia','Labiod Medjadja','Dahra'],
  'Laghouat':['El Beidha','Gueltat Sidi Saad','Brida','Ain Sidi Ali','Tadjemout','Hadj Mechri','Taouiala','El Ghicha','Tadjrouna','Sebgag','Sidi Bouzid','Oued Morra','Laghouat',"Oued M'zi",'Ksar El Hirane','El Assafia','Sidi Makhlouf','Hassi Delaa',"Hassi R'mel",'Ain Madhi','El Haouaita','Kheneg','Benacer Benchohra'],
  'Oum El Bouaghi':['Ain Babouche','Ain Beida','Ain Diss','Ain Fakroun','Ain Kercha','Ain Mlila','Ain Zitoun','Behir Chergui','Bir Chouhada','Dhalaa','El Amiria','El Belala','El Djazia','El Fedjoudj','El Harmilia','El Harrouche','Fkirina','Hanchir Toumghani','Ksar Sbahi','Meskiana','Oued Nini','Oum El Bouaghi','Rahia','Sigus','Souk Naamane','Zorg'],
  'Batna':['Abdelkader Azil','Ain Djasser','Ain Touta','Ain Yagout','Arris','Barika','Batna','Beni Foudhala El Hakania','Boulhilet','Boumagueur','Bouzina','Chemora','Chir','Djerma','El Hassi','El Madher','Fesdis','Foum Toub','Ghassira','Gosbat','Guigba','Hidoussa','Ichmoul','Inoughissen','Kimmel','Ksar Bellezma','Lazrou','Lemsane','Maafa','Merouana','Menaa','Metkaouak','N\'gaous','Ngaous','Nouader','Oued Chaaba','Oued El Ma','Ouyoun El Assafir','Ras El Aioun','Rhass','Seggana','Seriana','Sefiane','Talkhamt','Tazoult','Theniet El Abed','Tiklatine','Timgad','Tixter','Tigherghar','Tighanimine','Boumia','Oued Taga','Lazrou','Zanat El Beida'],
  'Béjaïa':['Adekar','Akbou','Amalou','Amizour','Aokas','Barbacha','Bejaia','Beni Djellil','Beni Ksila','Beni Maouche','Beni Mellikeche','Boukhelifa','Chemini','Darguina','Draa El Gaied','El Kseur','Feraoun','Fenaia Ilmaten','Ighil Ali','Ighram','Kherrata','Leflaye','Melbou','Oued Ghir','Ouzellaguene','Seddouk','Semaoune','Sigda','Souk El Tenine','Souk Oufella','Taourirt Ighil','Taskriout','Tifra','Tichy','Toudja'],
  'Biskra':['Ain Naga','Ain Zaatout','Biskra','Bordj Ben Azzouz','Branis','Chetma','Djemorah','Doucen','El Ghrous','El Hadjeb','El Kantara','El Outaya','Foughala','Lioua','Lichana','M\'Chouneche','Mekhadma','Meziraa','Oued Djellal','Ouled Djellal','Ras El Miad','Sidi Khaled','Sidi Okba','Tolga','Zeribet El Oued'],
  'Béchar':['Abadla','Ain Skhouna','Beni Ikhlef','Bechar','Boukais','El Ouata','Igli','Kenadsa','Lahmar','Mechraa Houari Boumediene','Meridja','Mogheul','Oulad Khodeir','Tabelbala','Taghit','Timoudi'],
  'Blida':['Ain Romana','Beni Tamou','Blida','Bougara','Boufarik','Bouinan','Bou Arfa','Chebli','Chiffa','Chrea','Djebabra','El Affroun','Guerrouaou','Hammam Melouane','Larbaa','Meftah','Mouzaia','Oued Djer','Ouled Yaich','Soumaa'],
  'Bouira':['Aghbalou','Ain Bessem','Ain Laloui','Ain Turk','Ait Laaziz','Bechloul','Bir Ghbalou','Bordj Okhriss','Bouira','Bouderbala','Chorfa','Dechmia','Dirrah','El Adjiba','El Asnam','El Hachimia','El Khabouzia','El Mokrani','Guerrouma','Hadjera Zerga','Hanif','Kadiria','Lakhdaria','M\'Chedallah','Maala','Mezdour','Oued El Berdi','Ouled Rached','Raouraoua','Ridane','Souk El Khemis','Sour El Ghozlane','Taguedit','Taghzout'],
  'Tamanrasset':['Abalessa','Ain Salah','Ain Guezzam','Foggaret Ez Zoua','Ideles','In Amenas','In Guezzam','In Salah','Tazrouk','Tamanrasset','Tin Zaouatine'],
  'Tébessa':['Ain Zerga','Bekkaria','Bir Dheheb','Bir El Ater','Cheria','El Aouinet','El Houidjbet','El Kouif','El Malabiod','El Meridj','El Ogla','Ferkane','Hammamet','Morsott','Negrine','Oum Ali','Bir El Ater','Stah Guentis','Tebessa','Tlidjane','Yabous'],
  'Tlemcen':['Ain Fezza','Ain Ghoraba','Ain Kebira','Ain Nehala','Ain Tallout','Ain Youcef','Azails','Bab El Assa','Beni Bahdel','Beni Boussaid','Beni Mester','Beni Ouarsous','Beni Snous','Bouhlou','Chetouane','Dar Yaghmoracene','El Gor','El Aricha','Fellaoucene','Ghazaouet','Hammam Boughrara','Hennaya','Honaine','Iferhounene','Maghnia','Mansourah','Marsa Ben M\'Hidi','Msirda Fouaga','Nedroma','Ouled Mimoun','Remchi','Sabra','Sebdou','Sidi Abdelli','Sidi Djillali','Sidi Medjahed','Souahlia','Souani','Terny Beni Hdiel','Tlemcen','Zenata'],
  'Tiaret':['Ain Bouchekif','Ain Deheb','Ain El Hadid','Ain Kermes','Ain Kerouane','Ain Zarit','Amoura','Bougara','Chehaida','Dahmouni','Djillali Ben Amar','El Hammadia','Faidja','Frenda','Guertoufa','Hamadia','Ksar Chellala','Mahdia','Medrissa','Mechraa Safa','Meghila','Mellakou','Nadorah','Oued Lilli','Rahouia','Rechaiga','Rosfa','Sebaine','Sebt','Serghine','Si Abdelghani','Sidi Abderrahmane','Sidi Ali Mellal','Sidi Bakhti','Sidi Hosni','Sougueur','Tagdemt','Takhemaret','Tiaret','Tousnina','Zmalet El Emir Abdelkader'],
  'Tizi Ouzou':['Abi Youcef','Aghribs','Ain El Hammam','Ain Zaouia','Ait Aggouacha','Ait Aissa Mimoun','Ait Boumahdi','Ait Chafaa','Ait Khelili','Ait Mahmoud','Ait Oumalou','Ait Toudert','Ait Yahia','Ait Yahia Moussa','Akerrou','Akbil','Akerrou','Alma','Amalaz','Ath Zmenzer','Azeffoun','Beni Aissi','Beni Douala','Beni Yenni','Beni Zmenzer','Boghni','Bou Adda','Bouzeguene','Draa Ben Khedda','Draa El Mizan','Freha','Frikat','Iferhounene','Iflissen','Illilten','Iloula Oumalou','Irdjen','Larbaa Nath Irathen','Maatkas','Makouda','Mekla','Mekla','Mizrana','Nait Chabane','Ouacif','Ouaguenoun','Oued Aissi','Ouadhias','Sahel','Souk El Thenine','Taddart','Tafoughalt','Tigzirt','Tirmitine','Tizi Ghennif','Tizi Gheniff','Tizi Ouzou','Tizi Rached','Yakourene','Zekri'],
  'Alger':['Ain Benian','Ain Taya','Alger Centre','Bab El Oued','Bab Ezzouar','Bains Romains','Baraki','Ben Aknoun','Beni Messous','Bir Mourad Rais','Bir Touta','Birtouta','Birkhadem','Bordj El Bahri','Bordj El Kiffan','Bouzareah','Casbah','Cheraga','Dar El Beida','Dely Brahim','Douera','Draria','El Achour','El Biar','El Harrach','El Marsa','El Mouradia','El Madania','Eucalyptus','Gue De Constantine','Hammamet','Heraoua','Hussein Dey','Khraicia','Kouba','Les Eucalyptus','Mahelma','Mohamed Belouizdad','Mohammadia','Oued Koriche','Ouled Chebel','Raiss Hamidou','Reghaïa','Rouiba','Saoula','Sidi Moussa','Souidania','Tessala El Merdja','Zeralda'],
  'Djelfa':['Ain El Ibel','Ain Maabed','Ain Oussera','Aoun El Assel','Ben Srour','Birine','Birkine','Bouira Lahdab','Charef','Dar Chioukh','Deldoul','Djelfa','Douis','El Guedid','El Idrissia','El Khemis','Faidh El Botma','Had Sahary','Hassi Bahbah','Hassi El Euch','Hassi Fedoul','Ismail','Jijelida','Kef Lakhdar','Lakhdariya','Messaad','Ml\'iliha','Oum Laadham','Sed Rahal','Selmana','Sidi Baizid','Sidi Ladjel','Zaafrane','Zelmat','Zaccar'],
  'Jijel':['Ain Makhlouf','Bouchelaghem','Bordj T\'Har','Chahna','Chekfa','Djimla','El Ancer','El Aouana','El Milia','Emir Abdelkader','Eraguene','Erraguene','Ghebala','Jijel','Kaous','Kemir','Ouadjana','Ouled Rabah','Selma Benziada','Settara','Sidi Abdelaziz','Sidi Marouf','Taher','Texenna','Ziama Mansouria'],
  'Sétif':['Ain Azel','Ain El Kebira','Ain Lahdjar','Ain Oulmene','Ain Roua','Ain Sebt','Ait Naoual Mezada','Ait Tizi','Amoucha','Bazer Sakhra','Belaa','Beni Aziz','Beni Ourtilane','Beni Mouhli','Bir El Arch','Bir Haddada','Bouandas','Bougaa','Boutaleb','Dehamcha','Djemila','Draa Kebila','El Eulma','El Ouldja','El Ouricia','Guidjel','Guellal','Guenzet','Guergour','Hammam Guergour','Hammam Soukhna','Harbil','Hamma','Ksar El Abtal','Maaouia','Maouaklane','Mezloug','N\'gaous','Ouled Si Ahmed','Ouled Tebben','Oum Laadham','Rasfa','Robbah','Salah Bey','Serdj El Ghoul','Sétif','Tachouda','Talaifacene','Taya','Tizi N\'Bechar'],
  'Saïda':['Ain El Hadjar','Ain Soltane','Doui Thabet','El Hassasna','El Houanet','Maamora','Moulay Larbi','Ouled Brahim','Ouled Khaled','Rebahia','Saida','Sidi Ahmed','Sidi Boubekeur','Sidi Amar','Tircine'],
  'Skikda':['Ain Bouziane','Ain Charchar','Ain Kechra','Azzaba','Beni Bechir','Beni Zid','Bekkouche Lakhdar','Bouchtata','Collo','Djendel Saadi Mohamed','El Hadaik','El Harrouch','Emdjez Edchich','Filfila','Ghedir Sahridj','Hamadi Krouma','Kanoua','Kerkera','Kheneg Mayoum','Oued Zhour','Ouled Attia','Ouled Hbaba','Rabta','Ramdane Djamel','Salah Bouchaour','Sidi Mezghiche','Skikda','Tamalous','Taourga','Zerdezas','Zitouna'],
  'Sidi Bel Abbès':['Ain Adden','Ain El Berd','Ain Kada','Ain Thrid','Ain Tindamine','Amarnas','Badredine El Mokrani','Ben Badis','Bir El Hammam','Boukhanifis','Chouala','Dhaya','El Hacaiba','El Haçaiba','Hassi Dahou','Hassi Zahana','Lamtar','Makedra','Marhoum','Mcid','Merine','Mezaourou','Mostefa Ben Brahim','Moulay Slissen','Oued Sebaa','Oued Taourira','Ras El Ma','Redjem Demouche','Sfisef','Sidi Bel Abbes','Sidi Brahim','Sidi Chaib','Sidi Daho Des Zairs','Sidi Hamadouche','Sidi Khaled','Sidi Lahcene','Sidi Yacoub','Tafissour','Taoudmout','Tessala','Tilmouni','Zerouala'],
  'Annaba':['Ain Berda','Annaba','Berrahal','Cheurfa','Chetaibi','El Bouni','El Eulma','El Hadjar','Eulma','Seraidi','Sidi Amar','Treat'],
  'Guelma':['Ain Ben Beida','Ain Hessainia','Ain Larbi','Ain Makhlouf','Ain Reggada','Ain Sandel','Belkheir','Ben Djarah','Beni Mezline','Bordj Sabat','Bouati Mahmoud','Bouhamdane','Bouchegouf','Dahouara','Djebala Khemissi','El Fedjoudj','Guelaat Bou Sbaa','Guelma','Hammam Debagh','Hammam N\'Bails','Heliopolis','Houari Boumediene','Khezaras','Medjez Amar','Medjez Sfa','Nechmaya','Oued Fragha','Oued Zenati','Ras El Agba','Roknia','Sellaoua Announa','Tamlouka'],
  'Constantine':['Ain Abid','Ain Smara','Beni Hamidane','Constantine','El Khroub','Hamma Bouziane','Ibn Badis','Ibn Ziad','Messaoud Boudjriou','Ouled Rahmoune','Zighoud Youcef'],
  'Médéa':['Ain Boucif','Ain Ouksir','Aziz','Berrouaghia','Bir Ben Laabed','Boghar','Bouaichoune','Bouchrahil','Boughezoul','Bouskene','Chelalet El Adhaoura','Cheniguel','Deux Bassins','Djouab','El Azizia','El Guelb El Kebir','El Hamdania','El Omaria','El Oued','Hannacha','Kef Lakhdar','Khams Djouamaa','Ksar El Boukhari','Maghraoua','Medea','Meghraoua','Mezerana','Meftaha','Mihoub','Ouamri','Oued Harbil','Oued Harbil','Oued Mellal','Ouled Antar','Ouled Bouachra','Ouled Daid','Ouled Maaref','Ouled Slama','Oum El Djalil','Ouzera','Rebaia','Sedraia','Seghouane','Si Mahdjoub','Sidi Damed','Sidi Errabia','Sidi Naamane','Sidi Zahar','Soumaa','Tafraout','Tamesguida','Tarmount','Tablat','Tizi Mahdi'],
  'Mostaganem':['Achaacha','Ain Boudinar','Ain Nouissy','Ain Sidi Cherif','Ain Tadles','Bouguirat','El Hassiane','Fornaka','Hadjadj','Khadra','Kheireddine','Mansourah','Mazagran','Mesra','Mostaganem','Nekmaria','Ouled Boughalem','Ouled Maallah','Safsaf','Sayada','Sidi Ali','Sidi Bellatar','Sidi Lakhdar','Sirat','Souaflia','Stidia','Tazgait','Touahria'],
  "M'Sila":['Ain El Melh','Ain El Hadjel','Ain Errich','Ain Fares','Ain Khadra','Ain Lahdjel','Aouf','Belaiba','Ben Srour','Benzouh','Berhoum','Bou Saada','Bouti Saour','Chellal','Dehahna','Djebel Messaad','El Hamel','El Houamed','Hammam Dalaa','Hammam Dhalaa','Khoubana','Ksar El Hirane','Ksiba','Lakahal','Lehdjel','M\'Cif','M\'Sila','Maadid','Magra','Maarif','Medjedel','Menaa','Moudjebara','Ouanougha','Ouled Addi Guebala','Ouled Attia','Ouled Derradj','Ouled Mansour','Ouled Slimane','Oultene','Sidi Aissa','Sidi M\'Hamed','Sidi Mansour','Slim','Souamaa','Tamsa','Tarmount','Zarzour'],
  'Mascara':['Ain Fekan','Ain Fares','Ain Fras','Ain Itekki','Ain Frass','Bou Hanifia','Chorfa','El Bordj','El Ghomri','El Hachem','El Keurt','Ferraguig','Froha','Ghriss','Guerdjoum','Hachem','Khalouia','Makdha','Mascara','Matemore','Mohammadia','Moctadoua','Moh Lamine','Nesmoth','Oggaz','Oued Taria','Ouillis','Sidi Abdeldjebar','Sidi Boussaid','Sidi Kada','Sig','Tighennif','Tizi','Zetema','Zahana'],
  'Ouargla':['Ain Beida','El Borma','El Hadjira','El Alia','Hassi Messaoud','In Amenas','Megarine','N\'goussa','Nezla','Ouargla','Rouissat','Sidi Khouiled','Taibet','Temacine','Tebesbest','Touggourt','Zaouia El Abidia'],
  'Oran':['Ain El Bya','Ain El Turk','Ain El Bia','Ain Kerma','Arzew','Ben Freha','Bethioua','Bir El Djir','Bousfer','Boutlelis','Cap Falcon','El Ançor','El Hassi','El Karma','Es Senia','Gdyel','Hassi Ben Okba','Hassi Mefsoukh','Mers El Hadjadj','Messerghine','Misserghin','Oued Tlelat','Oran','Sidi Ben Yebka','Sidi Chahmi','Sidi Marouf','Sin El Kbir','Tafraoui'],
  'El Bayadh':['Ain El Orak','Arbaouat','Boualem','Bougtoub','Cheguig','El Abiodh Sidi Cheikh','El Bayadh','El Bnoud','El Hammamat','Ghassoul','Kef El Ahmar','Krakda','Rogassa','Sidi Ameur','Sidi Slimane','Sidi Tifour','Stitten','Tousmouline'],
  'Illizi':['Bordj El Haouasse','Debdeb','Illizi','In Amenas','Djanet'],
  'Bordj Bou Arréridj':['Ain Taghrout','Azelev','Belimour','Bir Kasdali','Bordj Bou Arreridj','Bordj Ghedir','Bordj Zemoura','Djaafra','El Achir','El Anseur','El Main','El M\'hir','Ghilassa','Hasnaoua','Khelil','Ksour','Mansourah','Medjana','Ouled Braham','Ouled Dahmane','Ouled Sidi Ibrahim','Ras El Oued','Ravine','Ridane','Sidi Embarek','Taglait','Teniet En Nasr','Telidjen','Tixter'],
  'Boumerdès':['Beni Amrane','Bordj Menaiel','Boumerdas','Boudouaou','Boudouaou El Bahri','Boumerdes','Corso','Dellys','Djinet','El Kharrouba','Hammedi','Issers','Khemis El Khechna','Kirata','Larbatache','Leghata','Naciria','Ouled Aissa','Ouled Hedadj','Ouled Moussa','Si Mustapha','Souk El Had','Sidi Daoud','Taourga','Thenia','Tidjelabine','Zemmouri'],
  'El Tarf':['Ain Assel','Ain El Assel','Ain Kerma','Ben Mehidi','Berrihane','Besbes','Bougous','Bouteldja','Chbaita Mokhtar','Chebaita Mokhtar','Chihani','Dréan','El Aioun','El Kala','El Tarf','Hammam Beni Salah','Lac Des Oiseaux','Ouled Haddadj','Raml Souk','Souarekh','Zerizer','Zitouna'],
  'Tindouf':['Tindouf'],
  'Tissemsilt':['Ammari','Beni Chaib','Beni Lahcene','Bordj El Emir Khaled','Bordj Bou Naama','Boucaid','Khemisti','Lazharia','Lardjem','Layoune','Maalem Hanafi','Melaab','Ouled Bessem','Sidi Abed','Sidi Boutouchent','Sidi Lantri','Sidi Slimane','Theniet El Had','Tissemsilt','Youssoufia'],
  'El Oued':['Bayadha','ط¨ط¨ط§ظ†ة','Ben Guecha','Djamaa','Douar El Ma','El Mghair','El Oued','Guemar','Hamraia','Hassi Khalifa','Kouinine','Magrane','Mih Ouansa','Nakhla','Ourmas','Reguiba','Robbah','Sidi Aoun','Sidi Khelil','Still','Taghzout','Taleb Larbi','Tendla','Trifaoui'],
  'Khenchela':['Ain Touila','Babar','Baghai','Bouhmama','Chechar','Djellal','El Hamma','El Oueldja','Ensigha','Kais','Kaïs','Khenchela','Khirane','Mchouneche','Ouled Rechache','Remila','Taouziant','Yabous'],
  'Souk Ahras':['Ain Soltane','Ain Zana','Bir Bouhouche','Drea','Haddada','Hannach','Khedara','Khemissa','Merahna','M\'Daourouch','Ouled Driss','Ouled Moumen','Ragouba','Safel El Ouiden','Sedrata','Sidi Fredj','Souk Ahras','Taoura','Terraguelt','Tiffech','Zarouria'],
  'Tipaza':['Aghabal','Ahmer El Ain','Ain Tagourait','Attatba','Bou Ismail','Bourkika','Cherchell','Damous','El Hadjout','Fouka','Gouraya','Hadjout','Kolea','Larhat','Marengo','Meurad','Menaceur','Messelmoun','Nador','Sidi Amar','Sidi Ghiles','Sidi Rached','Sidi Semiane','Sidi Semiane','Tipaza','Zeroudah'],
  'Mila':['Ahmed Rachedi','Ain Beida Harriche','Ain El Mehdi','Ain Mellouk','Ain Tine','Amira Arras','Benyahia Abderrahmane','Bouhatem','Chelghoum Laid','Chigara','Dar Lecheikh','Dehamcha','El Mechira','Ferdjioua','Grarem Gouga','Hamala','Mila','Oued Athmania','Oued Endja','Oued Seguen','Rouached','Sidi Khelifa','Sidi Merouane','Tadjenanet','Teleghma','Tessala Lemtai','Tiberguent','Timagourine','Telerghma','Zeghaia'],
  'Aïn Defla':['Ain Benian','Ain Defla','Ain Lechiekh','Ain Soltane','Ain Torki','Ain Trik','Barbouche','Belaas','Bir Ould Khelifa','Bordj Emir Khaled','Boumedfaa','Bourached','Djelida','Djendel','El Abadia','El Amra','El Attaf','El Hassania','El Maine','Hammam Righa','Hoceinia','Khemis Miliana','Mekhatria','Miliana','Moulay Slissen','Oued Chorfa','Oued Djemaa','Oued El Djemaa','Oued Rouina','Ouellit','Rouina','Sidi Lakhdar','Tacheta Zougagha','Tarik Ibn Ziyad','Tiberkanine','Zeddine'],
  'Naâma':['Ain Ben Khelil','Ain Sefra','Asla','Djeniene Bourezg','El Biodh','Kasdir','Makman Ben Amer','Mecheria','Moghrar','Naama','Sfissifa','Tiout'],
  'Aïn Témouchent':['Aghlal','Ain El Arbaa','Ain Kihal','Ain Lachrak','Ain Kihel','Ain Temouchent','Ain Tolba','Aïn Temouchent','Beni Saf','Chaabat El Leham','El Amria','El Emir Abdelkader','El Malah','El Messaid','Hammam Bou Hadjar','Hassi El Ghella','Louza','Oued Berkeche','Oued Sabah','Oulhassa El Gheraba','Ras El Ma','Sidi Ben Adda','Sidi Boumediene','Sidi Ouriach','Sidi Safi','Terga','Tizi'],
  'Ghardaïa':['Berriane','Bounoura','Dhayet Bendhahoua','El Atteuf','Ghardaia','Guerrara','Hassi El Fehal','Hassi Fehal','Metlili','Mnea','Sebseb','Zelfana'],
  'Relizane':['Ain El Hamam','Ain Rahma','Ain Tarek','Ammi Moussa','Belaasel Bouzegza','Beni Dergoun','Beni Zentis','Dar Ben Abdellah','Djidioua','El Guettar','El Hassi','El Matmar','El Ouldja','Hamri','Kalaa','Lahlef','Laktabia','Mazouna','Mediouna','Mendes','Oued El Djemaa','Oued Rhiou','Ouled Saber','Oued El Djemaa','Ramka','Sidi Khettab','Sidi Lazreg','Sidi M\'Hamed Ben Aouda','Sidi M\'Hamed Ben Ali','Souk El Had','Yellel','Zemmora'],
  'Timimoun':['Aougrout','Charouine','Deldoul','Fenoughil','In Salah','Ksar Kaddour','Metarfa','Ouled Said','Ouled Normane','Timimoun','Tinerkouk'],
  'Bordj Badji Mokhtar':['Bordj Badji Mokhtar','Timiaouine'],
  'Ouled Djellal':['Ain Naga','Besbes','Doucen','Ouled Djellal','Ras El Miad','Sidi Khaled'],
  'Béni Abbès':['Beni Abbes','Beni Ikhlef','El Ouata','Igli','Ksabi','Tabelbala','Timoudi'],
  'In Salah':['Aoulef','Foggaret Ez Zoua','In Salah','Reggane'],
  'In Guezzam':['Ain Guezzam','In Guezzam','Tin Zaouatine'],
  'Touggourt':['El Allia','Megarine','Nezla','Tebesbest','Temacine','Touggourt','Zaouia El Abidia'],
  'Djanet':['Bordj El Haouasse','Djanet','Iherir'],
  'El M\'Ghair':['Djamaa','El Mghair','Hamraia','Oum Touyour','Reguiba','Still','Tendla'],
  'El Meniaa':['El Meniaa','Hassi Gara','Issameur'],
};
const WILAYA_LIST = Object.keys(WILAYAS_COMMUNES);

// ─── Status / Role colors ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  actif:    { bg: 'rgba(0,201,167,0.12)',  color: '#00C9A7', border: 'rgba(0,201,167,0.25)' },
  inactif:  { bg: 'rgba(122,139,173,0.1)', color: '#7A8BAD', border: 'rgba(122,139,173,0.2)' },
  suspendu: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'rgba(255,107,107,0.22)' },
};
const ROLE_COLORS = {
  admin:      { bg: 'rgba(255,159,67,0.12)', color: '#FF9F43' },
  medecin:    { bg: 'rgba(74,108,247,0.1)',  color: '#4A6CF7' },
  epidimio:   { bg: 'rgba(129,140,248,0.12)', color: '#818CF8' },
  anapate:    { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  pharmacie:  { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  biologiste: { bg: 'rgba(0,201,167,0.12)',  color: '#00C9A7' },
};
const ROLE_LABELS = {
  admin:     'Administrateur',
  medecin:   'Médecin',
  epidimio:  'Épidimio',
  anapate:   'Anapath',
  pharmacie: 'Pharmacie',
  biologiste:'Biologiste',
};
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'medecin', label: 'Médecin' },
  { value: 'epidimio', label: 'Épidimio' },
  { value: 'anapate', label: 'Anapath' },
  { value: 'pharmacie', label: 'Pharmacie' },
];
const ALL_PERMISSIONS = [
  { key: 'perm_read',   label: 'Lecture',      icon: '👁',  desc: 'Consulter les dossiers patients' },
  { key: 'perm_write',  label: 'Écriture',     icon: '✏',  desc: 'Créer / modifier des dossiers' },
  { key: 'perm_rcp',    label: 'RCP',          icon: '💬', desc: 'Participer aux réunions RCP' },
  { key: 'perm_lab',    label: 'Laboratoire',  icon: '🔬', desc: 'Accès aux données biologiques' },
  { key: 'perm_stats',  label: 'Statistiques', icon: '📊', desc: 'Voir les tableaux de bord' },
  { key: 'perm_import', label: 'Import',       icon: '📥', desc: 'Importer des données CSV/Excel' },
];

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState(
    user
      ? { ...user, password: '', password2: '' }
      : {
          nom: '', prenom: '', email: '', role: 'medecin',
          specialite: '', wilaya: '', commune: '', etablissement: '',
          statut: 'actif', telephone: '',
          perm_read: true, perm_write: false, perm_rcp: false,
          perm_lab: false, perm_stats: false, perm_import: false,
          password: '', password2: '',
        }
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const togglePerm = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }));

  const validate = () => {
    const e = {};
    if (!form.nom.trim())    e.nom    = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom = 'Obligatoire';
    if (!form.email.trim())  e.email  = 'Obligatoire';
    if (isNew) {
      if (!form.password)         e.password  = 'Le mot de passe est obligatoire';
      else if (form.password.length < 8) e.password = 'Minimum 8 caractères';
      if (form.password !== form.password2) e.password2 = 'Les mots de passe ne correspondent pas';
    } else if (form.password && form.password !== form.password2) {
      e.password2 = 'Les mots de passe ne correspondent pas';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const payload = { ...form };
    delete payload.password2;
    if (!payload.password) delete payload.password;
    try {
      await onSave(payload);
    } catch (err) {
      const apiErrors = {};
      if (err.email) apiErrors.email = err.email[0];
      if (err.password) apiErrors.password = err.password[0];
      if (err.non_field_errors) apiErrors.general = err.non_field_errors[0];
      setErrors(apiErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>
          <div style={s.modalIcon}>{isNew ? '➕' : '✏'}</div>
            {isNew ? 'Créer un utilisateur' : `Modifier — ${user.prenom} ${user.nom}`}
          </div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          {errors.general && (
            <div style={s.errBanner}>⚠ {errors.general}</div>
          )}

          {/* Identité */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Identité</div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Nom *</label>
                <input style={{ ...s.mi, ...(errors.nom ? s.miErr : {}) }}
                  value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom de famille" />
                {errors.nom && <span style={s.errTxt}>{errors.nom}</span>}
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Prénom *</label>
                <input style={{ ...s.mi, ...(errors.prenom ? s.miErr : {}) }}
                  value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
                {errors.prenom && <span style={s.errTxt}>{errors.prenom}</span>}
              </div>
            </div>
            <div style={s.mfg}>
              <label style={s.ml}>Email professionnel *</label>
              <input style={{ ...s.mi, ...(errors.email ? s.miErr : {}) }}
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="exemple@hopital.dz" />
              {errors.email && <span style={s.errTxt}>{errors.email}</span>}
            </div>
            <div style={{ ...s.mfg, marginTop: 12 }}>
              <label style={s.ml}>Téléphone</label>
              <input style={s.mi} value={form.telephone}
                onChange={e => setForm({ ...form, telephone: e.target.value })}
                placeholder="0770 123 456" />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>
              {isNew ? 'Mot de passe *' : 'Changer le mot de passe (optionnel)'}
            </div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>{isNew ? 'Mot de passe *' : 'Nouveau mot de passe'}</label>
                <input style={{ ...s.mi, ...(errors.password ? s.miErr : {}) }}
                  type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={isNew ? 'Minimum 8 caractères' : 'Laisser vide pour ne pas changer'} />
                {errors.password && <span style={s.errTxt}>{errors.password}</span>}
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Confirmer *</label>
                <input style={{ ...s.mi, ...(errors.password2 ? s.miErr : {}) }}
                  type="password" value={form.password2}
                  onChange={e => setForm({ ...form, password2: e.target.value })}
                  placeholder="Répéter le mot de passe" />
                {errors.password2 && <span style={s.errTxt}>{errors.password2}</span>}
              </div>
            </div>
          </div>

          {/* Rôle & Profil */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Rôle & Profil</div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Rôle</label>
                <select style={s.mi} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  {form.role && !ROLE_OPTIONS.some(opt => opt.value === form.role) && (
                    <option value={form.role}>Ancien rôle : {ROLE_LABELS[form.role] || form.role}</option>
                  )}
                </select>
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Spécialité</label>
                <input style={s.mi} value={form.specialite}
                  onChange={e => setForm({ ...form, specialite: e.target.value })} placeholder="ex: Oncologie" />
              </div>
            </div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Wilaya</label>
                <select
                  style={s.mi}
                  value={form.wilaya}
                  onChange={e => setForm({ ...form, wilaya: e.target.value, commune: '' })}
                >
                  <option value="">— Sélectionner —</option>
                  {WILAYA_LIST.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Commune</label>
                <select
                  style={{ ...s.mi, ...(!form.wilaya ? { color: '#aaa' } : {}) }}
                  value={form.commune}
                  onChange={e => setForm({ ...form, commune: e.target.value })}
                  disabled={!form.wilaya}
                >
                  <option value="">— Sélectionner —</option>
                  {(WILAYAS_COMMUNES[form.wilaya] || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Établissement</label>
                <input style={s.mi} value={form.etablissement}
                  onChange={e => setForm({ ...form, etablissement: e.target.value })} placeholder="CHU / EHU…" />
              </div>
            </div>
            <div style={{ ...s.mfg, marginTop: 12 }}>
              <label style={s.ml}>Statut du compte</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {['actif', 'inactif', 'suspendu'].map(st => (
                  <button key={st} type="button"
                    style={{ ...s.statusToggle, ...(form.statut === st ? s.statusToggleActive : {}) }}
                    onClick={() => setForm({ ...form, statut: st })}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Permissions d'accès</div>
            <div style={s.permGrid}>
              {ALL_PERMISSIONS.map(({ key, label, icon, desc }) => {
                const active = !!form[key];
                return (
                  <div key={key}
                    style={{ ...s.permCard, ...(active ? s.permCardActive : {}) }}
                    onClick={() => togglePerm(key)}>
                    <div style={s.permIcon}>{icon}</div>
                    <div style={s.permLabel}>{label}</div>
                    <div style={s.permDesc}>{desc}</div>
                    <div style={{ ...s.permCheck, ...(active ? s.permCheckActive : {}) }}>{active ? '✓' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={s.modalFooter}>
          <button style={s.btnGhost} onClick={onClose} disabled={loading}>Annuler</button>
          <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Chargement…' : isNew ? '✓ Créer l\'utilisateur' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────
function UsersPage({ search }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/users/');
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const handleSave = async (formData) => {
    if (editUser) {
      const updated = await apiFetch(`/users/${editUser.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? updated : u));
      showToast(`✓ Utilisateur ${formData.prenom} ${formData.nom} modifié`);
    } else {
      const created = await apiFetch('/users/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setUsers(prev => [created, ...prev]);
      showToast(`✓ Compte créé — ${formData.prenom} ${formData.nom} peut maintenant se connecter`);
    }
    setShowModal(false);
    setEditUser(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le compte de ${name} ?`)) return;
    try {
      await apiFetch(`/users/${id}/`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast(`✓ Compte supprimé`);
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const filtered = users.filter(u =>
    `${u.prenom} ${u.nom} ${u.email} ${u.role} ${u.wilaya} ${u.commune} ${u.etablissement}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast.msg && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? 'linear-gradient(135deg,#FF6B6B,#e74c3c)' : 'linear-gradient(135deg,#00C9A7,#00a98b)' }}>
          {toast.msg}
        </div>
      )}
      {(showModal || editUser) && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSave={handleSave}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={s.pageTitle}>
          Mes utilisateurs
          <span style={s.pageTitleCount}>{filtered.length} compte{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowModal(true)}>➕ Nouvel utilisateur</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7A8BAD' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Chargement des utilisateurs…
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Utilisateur', 'Rôle', 'Spécialité', 'Établissement', 'Permissions', 'Statut', 'Créé le', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                  <td style={s.td}>
                    <div style={s.patientCell}>
                      <div style={{
                        ...s.patientAvatar,
                        background: ROLE_COLORS[u.role]?.bg || '#eee',
                        color: ROLE_COLORS[u.role]?.color || '#555'
                      }}>
                        {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '?')}
                      </div>
                      <div>
                        <div style={s.patientName}>{u.prenom} {u.nom}</div>
                        <div style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 600 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.roleChip, ...ROLE_COLORS[u.role] }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={s.td}><span style={{ fontSize: 13, color: '#4A5568' }}>{u.specialite || '—'}</span></td>
                  <td style={s.td}>
                    <div style={{ fontSize: 12, color: '#4A6CF7', fontWeight: 700 }}>{u.etablissement || '—'}</div>
                    <div style={{ fontSize: 11, color: '#7A8BAD' }}>
                      {[u.wilaya, u.commune].filter(Boolean).join(' › ') || '—'}
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ALL_PERMISSIONS.filter(p => u[p.key]).map(p => (
                        <span key={p.key} style={s.permBadge} title={p.desc}>{p.icon} {p.label}</span>
                      ))}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, ...(STATUS_COLORS[u.statut] || STATUS_COLORS.inactif) }}>
                      {u.statut?.charAt(0).toUpperCase() + u.statut?.slice(1)}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: '#7A8BAD', fontWeight: 600 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.actionBtns}>
                      <button style={s.iconBtnBlue} title="Modifier" onClick={() => setEditUser(u)}>✏</button>
                      <button style={{ ...s.iconBtnBlue, color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.3)' }}
                        title="Supprimer" onClick={() => handleDelete(u.id, `${u.prenom} ${u.nom}`)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#7A8BAD', padding: 50 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
                    <div style={{ fontWeight: 700 }}>Aucun utilisateur créé</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Cliquez sur « Nouvel utilisateur » pour commencer</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Logs Page ────────────────────────────────────────────────────────────────
function LogsPage({ search }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiFetch('/logs/')
      .then(data => setLogs(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs
    .filter(l => filter === 'all' || l.action === filter)
    .filter(l => `${l.user_name} ${l.action} ${l.detail}`.toLowerCase().includes(search.toLowerCase()));

  const logStyle = (action) => ({
    login:  { bg: 'rgba(0,201,167,0.1)',  color: '#00C9A7', icon: '🔑' },
    logout: { bg: 'rgba(74,108,247,0.1)', color: '#4A6CF7', icon: '🚪' },
    action: { bg: 'rgba(255,162,107,0.1)', color: '#FFA26B', icon: '⚡' },
  }[action] || { bg: '#eee', color: '#666', icon: '•' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={s.pageTitle}>
          Journal d'activité
          <span style={s.pageTitleCount}>{filtered.length} événements</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'Tout'], ['login', 'Connexions'], ['logout', 'Déconnexions'], ['action', 'Actions']].map(([val, label]) => (
            <button key={val}
              style={{ ...s.filterBtn, ...(filter === val ? s.filterBtnActive : {}) }}
              onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7A8BAD' }}>⏳ Chargement…</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Utilisateur', 'Type', 'Action', 'Détail', 'Horodatage'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const ls = logStyle(l.action);
                return (
                  <tr key={l.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                    <td style={s.td}>
                      <div style={s.patientCell}>
                        <div style={{ ...s.patientAvatar, background: ls.bg, color: ls.color, fontSize: 14 }}>{ls.icon}</div>
                        <span style={s.patientName}>{l.user_name}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800, background: ls.bg, color: ls.color }}>
                        {ls.icon} {l.action === 'login' ? 'Connexion' : l.action === 'logout' ? 'Déconnexion' : 'Action'}
                      </span>
                    </td>
                    <td style={s.td}><span style={{ fontWeight: 700, color: '#1A2B4A', fontSize: 13 }}>{l.action}</span></td>
                    <td style={s.td}><span style={{ fontSize: 12, color: '#7A8BAD', fontWeight: 600 }}>{l.detail || '—'}</span></td>
                    <td style={s.td}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, color: '#4A6CF7' }}>
                        {new Date(l.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#7A8BAD', padding: 40 }}>Aucun journal trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
function OverviewPage({ usersCount, logsCount, setPage }) {
  return (
    <>
      <div style={s.statsGrid}>
        {[
          { label: 'Mes utilisateurs', value: String(usersCount), delta: 'comptes utilisateurs', icon: '👥', color: '#4A6CF7' },
          { label: 'Activités enregistrées', value: String(logsCount), delta: 'dans le journal', icon: '📋', color: '#00C9A7' },
          { label: 'Statut système', value: 'En ligne', delta: 'Backend connecté', icon: '✅', color: '#9B59B6' },
        ].map(({ label, value, delta, icon, color }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statIcon, background: color + '18', color }}>{icon}</div>
            <div style={s.statInfo}>
              <div style={s.statValue}>{value}</div>
              <div style={s.statLabel}>{label}</div>
              <div style={{ ...s.statDelta, color }}>{delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.sectionHeader}>
        <div style={s.sectionTitle}>Navigation rapide</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { id: 'users', icon: '👤', label: 'Gérer mes utilisateurs', sub: 'Créer des comptes utilisateurs', color: 'linear-gradient(135deg,#4A6CF7,#6B87FF)' },
          { id: 'logs',  icon: '📋', label: 'Journal d\'activité',     sub: 'Connexions & actions des utilisateurs',  color: 'linear-gradient(135deg,#9B59B6,#8e44ad)' },
        ].map(({ id, icon, label, sub, color }) => (
          <div key={id} style={s.quickCard} onClick={() => setPage(id)}>
            <div style={{ ...s.quickIcon, background: color }}>{icon}</div>
            <div style={s.quickLabel}>{label}</div>
            <div style={s.quickSub}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={s.infoBanner}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>💡</div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          Comment ça marche ?
        </div>
        <div style={{ fontSize: 13, color: '#7A8BAD', lineHeight: 1.6 }}>
          1. Créez un compte pour chaque utilisateur via <strong>« Gérer mes utilisateurs »</strong><br />
          2. Définissez un <strong>email</strong> et un <strong>mot de passe</strong> sécurisé<br />
          3. Assignez les <strong>permissions</strong> adaptées à leur rôle<br />
          4. L'utilisateur peut maintenant se connecter avec ses identifiants
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState('overview');
  const [search, setSearch] = useState('');
  const [usersCount, setUsersCount] = useState(0);
  const [logsCount, setLogsCount] = useState(0);

  useEffect(() => {
    apiFetch('/users/').then(d => setUsersCount((Array.isArray(d) ? d : d.results || []).length)).catch(() => {});
    apiFetch('/logs/').then(d => setLogsCount((Array.isArray(d) ? d : d.results || []).length)).catch(() => {});
  }, []);

  const navItems = [
    { id: 'overview', icon: '🏠', label: 'Vue d\'ensemble' },
    { id: 'users',    icon: '👤', label: 'Mes utilisateurs' },
    { id: 'logs',     icon: '📋', label: 'Journal' },
    { id: 'fields',   icon: '🎛️', label: 'Champs personnalisés' },
    { id: 'statistics',  icon: '📊', label: 'Statistiques' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div style={s.root}>
      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarBrand}>
          <div style={s.brandIcon}>⚕</div>
          <div>
            <span style={s.brandName}>MedDossier</span>
            <div style={s.brandSub}>Administration</div>
          </div>
        </div>

        <nav style={s.nav}>
          {navItems.map(({ id, icon, label }) => (
            <button key={id}
              style={{ ...s.navItem, ...(page === id ? s.navActive : {}) }}
              onClick={() => {
                if (id === 'statistics') {
                  navigate('/statistics');
                  return;
                }
                setPage(id);
                setSearch('');
              }}>
              <span style={s.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.adminBadge}>⚙ Administrateur</div>
          <div style={s.userCard}>
            <div style={s.userAvatar}>AD</div>
            <div>
              <div style={s.userName}>Administrateur</div>
              <div style={s.userRole}>Registre National</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>⬅ Déconnexion</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={s.main}>
        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topbarTitle}>
  {page === 'overview'    && 'Tableau de bord Admin'}
  {page === 'users'       && 'Gestion des utilisateurs'}
  {page === 'logs'        && 'Journal d\'activité'}
  {page === 'fields'      && 'Champs personnalisés'}
  {page === 'statistics'  && 'Statistiques'}
</div>
            <div style={s.topbarSub}>Registre National du Cancer — Panel Administrateur</div>
          </div>
          <div style={s.topbarRight}>
            {(page === 'users' || page === 'logs') && (
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input style={s.searchInput} type="text"
                  placeholder="Rechercher…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <div style={s.avatar}>AD</div>
          </div>
        </div>

        {page === 'overview' && <OverviewPage usersCount={usersCount} logsCount={logsCount} setPage={setPage} />}
        {page === 'users'    && <UsersPage search={search} />}
        {page === 'logs'     && <LogsPage search={search} />}
        {page === 'fields'   && <CustomFieldsPage search={search} />}
        {page === 'statistics' && <StatisticsEditor />}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: { display: 'flex', minHeight: '100vh', fontFamily: "'Nunito', sans-serif", background: '#EEF2FF' },
  sidebar: { width: 250, flexShrink: 0, background: 'linear-gradient(170deg, #1a2f6b 0%, #0f1c3f 100%)', display: 'flex', flexDirection: 'column', padding: '28px 16px', position: 'sticky', top: 0, height: '100vh' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  brandIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 5px 15px rgba(74,108,247,0.5)' },
  brandName: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 16, color: '#fff', display: 'block' },
  brandSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' },
  nav: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', background: 'transparent', fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: '0.2s', textAlign: 'left', width: '100%' },
  navActive: { background: 'rgba(74,108,247,0.3)', color: '#fff', fontWeight: 800, boxShadow: '0 2px 12px rgba(74,108,247,0.25)' },
  navIcon: { fontSize: 17, width: 20, textAlign: 'center' },
  sidebarBottom: { display: 'flex', flexDirection: 'column', gap: 8 },
  adminBadge: { padding: '6px 14px', background: 'rgba(155,89,182,0.25)', borderRadius: 8, fontSize: 11, fontWeight: 800, color: '#c39bd3', letterSpacing: '0.5px', textAlign: 'center' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#9B59B6,#c39bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  userName: { fontSize: 13, fontWeight: 800, color: '#fff' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  logoutBtn: { padding: '9px 14px', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  topbarTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  topbarSub: { fontSize: 13, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#7A8BAD' },
  searchInput: { background: '#fff', border: '1.5px solid #DDE4F3', borderRadius: 30, padding: '10px 16px 10px 38px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: 260 },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#9B59B6,#c39bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(155,89,182,0.3)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', gap: 16, border: '1.5px solid #EEF2FF' },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  statInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  statValue: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  statLabel: { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  statDelta: { fontSize: 11, fontWeight: 800, marginTop: 2 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: '#1A2B4A' },
  quickCard: { background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1.5px solid #EEF2FF', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: '0.22s', boxShadow: '0 4px 14px rgba(74,108,247,0.06)' },
  quickIcon: { width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' },
  quickLabel: { fontSize: 14, fontWeight: 800, color: '#1A2B4A' },
  quickSub: { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  infoBanner: { background: 'linear-gradient(135deg,rgba(74,108,247,0.05),rgba(0,201,167,0.03))', border: '1.5px solid rgba(74,108,247,0.15)', borderRadius: 16, padding: '24px 28px' },
  pageTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: '#1A2B4A', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 },
  pageTitleCount: { fontSize: 13, fontWeight: 700, color: '#7A8BAD', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', border: '1.5px solid #EEF2FF' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#F5F8FF' },
  th: { padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '0.9px', borderBottom: '1.5px solid #EEF2FF', whiteSpace: 'nowrap' },
  tr: { transition: '0.15s' },
  td: { padding: '13px 16px', fontSize: 13, color: '#1A2B4A', fontWeight: 600, borderBottom: '1px solid #EEF2FF' },
  patientCell: { display: 'flex', alignItems: 'center', gap: 10 },
  patientAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'rgba(74,108,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7', fontWeight: 800, fontSize: 11, flexShrink: 0 },
  patientName: { fontWeight: 700, color: '#1A2B4A', fontSize: 13 },
  statusBadge: { padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800, border: '1.5px solid' },
  roleChip: { padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800 },
  permBadge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(74,108,247,0.08)', color: '#4A6CF7', whiteSpace: 'nowrap' },
  actionBtns: { display: 'flex', gap: 6 },
  iconBtnBlue: { width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(74,108,247,0.2)', background: 'rgba(74,108,247,0.05)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7', transition: '0.2s' },
  filterBtn: { padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#7A8BAD', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  filterBtnActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.55)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 70px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1.5px solid #EEF2FF' },
  modalTitle: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: '#1A2B4A' },
  modalIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' },
  modalClose: { width: 34, height: 34, borderRadius: 8, border: '1.5px solid #DDE4F3', background: '#F5F8FF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A8BAD' },
  modalBody: { padding: '24px 28px', overflowY: 'auto', flex: 1 },
  modalSection: { marginBottom: 24 },
  modalSectionLabel: { fontSize: 10.5, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '1.3px', marginBottom: 14 },
  modalGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  mfg: { display: 'flex', flexDirection: 'column', gap: 5 },
  ml: { fontSize: 11.5, fontWeight: 700, color: '#7A8BAD' },
  mi: { background: '#F5F8FF', border: '1.5px solid #DDE4F3', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: '100%', boxSizing: 'border-box' },
  miErr: { borderColor: '#FF6B6B', background: 'rgba(255,107,107,0.04)' },
  errTxt: { fontSize: 11, color: '#FF6B6B', fontWeight: 700 },
  errBanner: { background: 'rgba(255,107,107,0.08)', border: '1.5px solid rgba(255,107,107,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#FF6B6B', fontWeight: 700, marginBottom: 16 },
  statusToggle: { padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#7A8BAD', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  statusToggleActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  permGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  permCard: { padding: '14px 12px', border: '2px solid #DDE4F3', borderRadius: 12, cursor: 'pointer', transition: '0.2s', position: 'relative', background: '#F5F8FF' },
  permCardActive: { border: '2px solid #4A6CF7', background: 'rgba(74,108,247,0.05)' },
  permIcon: { fontSize: 20, marginBottom: 6 },
  permLabel: { fontSize: 13, fontWeight: 800, color: '#1A2B4A', marginBottom: 3 },
  permDesc: { fontSize: 11, color: '#7A8BAD', lineHeight: 1.4 },
  permCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', border: '2px solid #DDE4F3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 },
  permCheckActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  modalFooter: { display: 'flex', gap: 12, padding: '18px 28px', borderTop: '1.5px solid #EEF2FF', justifyContent: 'flex-end' },
  btnPrimary: { padding: '11px 24px', borderRadius: 30, border: 'none', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", boxShadow: '0 6px 20px rgba(74,108,247,0.35)', transition: '0.2s' },
  btnGhost: { padding: '11px 24px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', color: '#7A8BAD', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  toast: { position: 'fixed', bottom: 24, right: 24, color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 2000, fontFamily: "'Nunito', sans-serif", maxWidth: 400 },
};

